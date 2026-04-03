import React, { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";
import { DASHBOARD_ORIGIN } from "./buildEnv.js";
import { obtainNewJwt, syncAccessTokenFromDashboardTab, resolveDashboardOriginForUi } from "./plApi.js";

const defaultCache = {
  productiveToday: 0,
  focusTargetSeconds: 0,
  focusProgressPercent: 0,
  goalsAverageProgress: 0,
  goalsCount: 0,
  goalsDisplay: [],
  goalsDateKey: "",
  updatedAt: 0,
};

/** YYYY-MM-DD in the user’s timezone (must match background goals request). */
function popupLocalCalendarDateKey() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return new Date().toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return new Date().toLocaleDateString("en-CA");
  }
}

/** Must match extension background FACET_SEP — roll up path facets per host in the popup. */
const FACET_SEP = "\u001f";

function aggregateSiteTimesByHost(siteTimes) {
  if (!siteTimes || typeof siteTimes !== "object") return {};
  const acc = {};
  for (const [k, sec] of Object.entries(siteTimes)) {
    const i = k.indexOf(FACET_SEP);
    const host = i === -1 ? k : k.slice(0, i);
    acc[host] = (acc[host] || 0) + sec;
  }
  return acc;
}

function hostFromStoredFacet(facetOrHost) {
  if (!facetOrHost || typeof facetOrHost !== "string") return "";
  const i = facetOrHost.indexOf(FACET_SEP);
  return i === -1 ? facetOrHost : facetOrHost.slice(0, i);
}

function formatTime(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mRemaining = m % 60;
  return `${h}h ${mRemaining}m`;
}

/** Short duration for goal chips (no seconds if ≥1m). */
function formatShortDur(sec) {
  const s = Math.max(0, Math.floor(Number(sec) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function goalChipTimeRatio(g) {
  const cur = formatShortDur(g.currentSeconds);
  const tgt = formatShortDur(g.targetSeconds);
  if (g.type === "unproductive") return `${cur} / ${tgt} max`;
  return `${cur} / ${tgt}`;
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function ProgressRow({ label, sublabel, percent, barClass = "", valueLabel }) {
  const p = Math.min(100, Math.max(0, Math.round(Number(percent) || 0)));
  const right = valueLabel !== undefined ? valueLabel : `${p}%`;
  return (
    <div className="progress-block">
      <div className="progress-block-header">
        <span className="progress-label">{label}</span>
        <span className="progress-percent">{right}</span>
      </div>
      {sublabel ? <p className="progress-sublabel">{sublabel}</p> : null}
      <div
        className="progress-track"
        role="progressbar"
        aria-valuenow={p}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={`progress-fill ${barClass}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

/** checking | pick | waiting-account | app */
function App() {
  const [uiMode, setUiMode] = useState("checking");
  const [guestError, setGuestError] = useState("");
  const [guestBusy, setGuestBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);

  const [siteTimes, setSiteTimes] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [popupCache, setPopupCache] = useState(defaultCache);
  /** Vercel or localhost — matches an open dashboard tab when possible. */
  const [linkOrigin, setLinkOrigin] = useState(DASHBOARD_ORIGIN);
  const uiModeRef = useRef(uiMode);
  uiModeRef.current = uiMode;

  useEffect(() => {
    resolveDashboardOriginForUi()
      .then(setLinkOrigin)
      .catch(() => { });
  }, []);

  const refreshAuthMode = useCallback(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) {
      setUiMode("app");
      return;
    }
    chrome.storage.local.get(["accessToken", "extensionAuthChoice"], (data) => {
      if (data?.accessToken && typeof data.accessToken === "string" && data.accessToken.length > 0) {
        setUiMode("app");
        return;
      }
      if (data?.extensionAuthChoice === "account") {
        setUiMode("waiting-account");
        return;
      }
      setUiMode("pick");
    });
  }, []);

  useEffect(() => {
    refreshAuthMode();
  }, [refreshAuthMode]);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    const handler = (changes, area) => {
      if (area !== "local") return;
      const t = changes.accessToken?.newValue;
      if (t && typeof t === "string" && t.length > 0) {
        setUiMode("app");
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  const applyThemeToChrome = useCallback((dark) => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("pl-popup--light", !dark);
      document.body.classList.toggle("pl-popup--dark", dark);
      document.body.style.backgroundColor = dark ? "#0c0e14" : "#eef0f4";
    }
  }, []);

  const readStorage = useCallback(() => {
    if (uiModeRef.current !== "app") return;
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    chrome.storage.local.get(
      [
        "siteTimes",
        "activeTab",
        "activeFacetKey",
        "startTime",
        "lastSaveTime",
        "preferences",
        "isDarkMode",
        "extensionPopupCache",
        "currentDate",
      ],
      (data) => {
        // Bug fix: if the background worker hasn't done its midnight reset yet,
        // the stored siteTimes belong to a previous day. Don't display them.
        const today = new Date().toDateString();
        const isStaleDate = data.currentDate && data.currentDate !== today;
        let times = isStaleDate ? {} : aggregateSiteTimesByHost(data.siteTimes || {});

        let dark = true;
        if (data.preferences?.theme === "light" || data.preferences?.theme === "dark") {
          dark = data.preferences.theme === "dark";
        } else if (data.isDarkMode !== undefined) {
          dark = Boolean(data.isDarkMode);
        }
        setIsDarkMode(dark);
        applyThemeToChrome(dark);

        // Only add live elapsed time if the date is current (not stale)
        if (!isStaleDate && data.activeTab && data.startTime) {
          const start = data.lastSaveTime || data.startTime;
          const elapsed = (Date.now() - start) / 1000;
          const facet =
            typeof data.activeFacetKey === "string" && data.activeFacetKey
              ? data.activeFacetKey
              : data.activeTab;
          const host = hostFromStoredFacet(facet);
          if (host) {
            times = { ...times, [host]: (times[host] || 0) + elapsed };
          }
        }
        setSiteTimes(times);
        setActiveTab(isStaleDate ? null : data.activeTab);

        if (data.extensionPopupCache && typeof data.extensionPopupCache === "object") {
          const cache = { ...defaultCache, ...data.extensionPopupCache };
          const localCalKey = popupLocalCalendarDateKey();
          const goalsWrongDay =
            !isStaleDate &&
            cache.goalsDateKey &&
            typeof cache.goalsDateKey === "string" &&
            cache.goalsDateKey !== localCalKey;
          if (isStaleDate || goalsWrongDay) {
            cache.goalsDisplay = [];
            cache.goalsCount = 0;
            cache.goalsAverageProgress = 0;
          }
          setPopupCache(cache);
          if (goalsWrongDay) {
            try {
              chrome.runtime.sendMessage({ action: "refreshPopupCache" });
            } catch {
              /* ignore */
            }
          }
        }
      },
    );
  }, [applyThemeToChrome]);

  useEffect(() => {
    if (uiMode !== "app") return;
    readStorage();
    try {
      chrome.runtime.sendMessage({ action: "refreshPopupCache" });
    } catch {
      /* ignore */
    }
    const interval = setInterval(readStorage, 1000);
    return () => clearInterval(interval);
  }, [readStorage, uiMode]);

  useEffect(() => {
    applyThemeToChrome(isDarkMode);
  }, [isDarkMode, applyThemeToChrome]);

  useEffect(() => {
    if (uiMode === "app" || typeof chrome === "undefined" || !chrome.storage?.local) return;
    chrome.storage.local.get(["preferences", "isDarkMode"], (data) => {
      let dark = true;
      if (data.preferences?.theme === "light" || data.preferences?.theme === "dark") {
        dark = data.preferences.theme === "dark";
      } else if (data.isDarkMode !== undefined) {
        dark = Boolean(data.isDarkMode);
      }
      setIsDarkMode(dark);
      applyThemeToChrome(dark);
    });
  }, [uiMode, applyThemeToChrome]);

  useEffect(() => {
    if (uiMode !== "app") return;
    if (typeof chrome === "undefined" || !chrome.storage?.onChanged) return;
    const handler = (changes, area) => {
      if (area !== "local") return;
      if (changes.extensionPopupCache?.newValue) {
        setPopupCache({ ...defaultCache, ...changes.extensionPopupCache.newValue });
      }
      if (changes.preferences?.newValue?.theme) {
        setIsDarkMode(changes.preferences.newValue.theme === "dark");
      }
      if (changes.siteTimes || changes.activeTab || changes.startTime || changes.lastSaveTime) {
        readStorage();
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, [readStorage, uiMode]);

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    applyThemeToChrome(newDark);
    chrome.storage.local.get(["preferences"], (data) => {
      const prev = data.preferences && typeof data.preferences === "object" ? data.preferences : {};
      chrome.storage.local.set({
        isDarkMode: newDark,
        preferences: { ...prev, theme: newDark ? "dark" : "light" },
      });
    });
  };

  const handleDashboard = () => {
    const dashboardUrl = linkOrigin;
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: dashboardUrl });
      return;
    }
    window.open(dashboardUrl, "_blank", "noopener,noreferrer");
  };

  const handleClearData = () => {
    chrome.storage.local.set({ siteTimes: {} }, () => {
      chrome.runtime.sendMessage({ action: "resetTracking" });
      readStorage();
    });
  };

  const sortedSites = Object.entries(siteTimes)
    .filter(([, sec]) => sec >= 1)
    .sort((a, b) => b[1] - a[1]);

  const { goalsAverageProgress, goalsCount, goalsDisplay } = popupCache;

  const goalsSublabel =
    goalsCount > 0
      ? `${goalsCount} for today`
      : "";

  const openLoginTab = () => {
    const q = `?callbackUrl=${encodeURIComponent("/")}`;
    const url = `${linkOrigin}/auth/login${q}`;
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const openRegisterTab = () => {
    const url = `${linkOrigin}/auth/register?callbackUrl=${encodeURIComponent("/")}`;
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleContinueGuest = async () => {
    setGuestError("");
    setGuestBusy(true);
    try {
      await obtainNewJwt();
      setUiMode("app");
    } catch (e) {
      setGuestError(e?.message || "Could not start guest session.");
    } finally {
      setGuestBusy(false);
    }
  };

  const handleChooseAccount = async () => {
    await new Promise((res) => {
      chrome.storage.local.set({ extensionAuthChoice: "account" }, res);
    });
    openLoginTab();
    setUiMode("waiting-account");
  };

  const handleCheckSignedIn = async () => {
    setSyncBusy(true);
    try {
      await syncAccessTokenFromDashboardTab();
      const { accessToken } = await chrome.storage.local.get("accessToken");
      if (accessToken) {
        setUiMode("app");
        try {
          chrome.runtime.sendMessage({ action: "refreshPopupCache" });
        } catch {
          /* ignore */
        }
      }
    } finally {
      setSyncBusy(false);
    }
  };

  const handleBackToChoices = async () => {
    await new Promise((res) => {
      chrome.storage.local.remove(["extensionAuthChoice"], res);
    });
    setUiMode("pick");
    setGuestError("");
  };

  if (uiMode === "checking") {
    return (
      <div className={`pl-popup pl-popup--${isDarkMode ? "dark" : "light"} pl-auth-gate`}>
        <p className="pl-muted" style={{ margin: 0 }}>
          Loading…
        </p>
      </div>
    );
  }

  if (uiMode === "pick") {
    return (
      <div className={`pl-popup pl-popup--${isDarkMode ? "dark" : "light"} pl-auth-gate`}>
        <div className="pl-auth-card">
          <header className="pl-header pl-auth-header">
            <div className="pl-auth-brand">
              <img src="/icons/icon.png" alt="ProdLytics Logo" className="pl-auth-logo" />
              <div>
                <p className="pl-auth-kicker">Welcome</p>
                <h1 className="pl-title pl-auth-title">ProdLytics</h1>
                <p className="pl-popup-hint pl-auth-lead">
                  Track time in the browser. Choose guest for this device only, or sign in to sync with your dashboard and
                  keep progress in your account.
                </p>
              </div>
            </div>
            <button
              type="button"
              className="pl-theme-icon-btn"
              onClick={toggleTheme}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? <SunIcon /> : <MoonIcon />}
            </button>
          </header>
          <div className="pl-auth-actions">
            <button
              type="button"
              className="pl-btn pl-btn-google"
              onClick={() => void handleChooseAccount()}
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
            <div className="pl-auth-divider">
              <span>or</span>
            </div>
            <button
              type="button"
              className="pl-btn pl-btn-primary pl-btn-guest"
              disabled={guestBusy}
              onClick={() => void handleContinueGuest()}
            >
              {guestBusy ? "Starting…" : "Continue as guest"}
            </button>
            <button type="button" className="pl-btn pl-btn-secondary" onClick={() => void handleChooseAccount()}>
              Email or Password
            </button>
            <p className="pl-auth-foot">
              Sign-in syncs your dashboard and keeps progress across devices.
            </p>
          </div>
          {guestError ? (
            <p className="pl-auth-error" role="alert">
              {guestError}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (uiMode === "waiting-account") {
    return (
      <div className={`pl-popup pl-popup--${isDarkMode ? "dark" : "light"} pl-auth-gate`}>
        <header className="pl-header">
          <div>
            <h1 className="pl-title">Finish signing in</h1>
            <p className="pl-popup-hint" style={{ maxWidth: "100%" }}>
              Use <strong>Sign in with Google</strong> or email on the tab we opened. Keep the ProdLytics dashboard open,
              then tap <em>Pull my session</em> below.
            </p>
          </div>
          <button type="button" className="pl-theme-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
            {isDarkMode ? <SunIcon /> : <MoonIcon />}
          </button>
        </header>
        <div className="pl-auth-actions">
          <button type="button" className="pl-btn pl-btn-primary" disabled={syncBusy} onClick={() => void handleCheckSignedIn()}>
            {syncBusy ? "Checking…" : "Pull my session from dashboard"}
          </button>
          <button type="button" className="pl-btn pl-btn-secondary" onClick={openLoginTab}>
            Open login again
          </button>
          <button type="button" className="pl-btn pl-btn-secondary" onClick={openRegisterTab}>
            Create account
          </button>
          <button type="button" className="pl-auth-link" onClick={() => void handleBackToChoices()}>
            ← Back to choices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`pl-popup ${isDarkMode ? "pl-popup--dark" : "pl-popup--light"}`}>
      <header className="pl-header">
        <div>
          <h1 className="pl-title">ProdLytics</h1>
          <p className="pl-popup-hint">
            Keep a ProdLytics tab open or click Sync Extension on the site so this popup uses the same login and
            today&apos;s goals.
          </p>
        </div>
        <button
          type="button"
          className="pl-theme-icon-btn"
          onClick={toggleTheme}
          aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          title={isDarkMode ? "Light mode" : "Dark mode"}
        >
          {isDarkMode ? <SunIcon /> : <MoonIcon />}
        </button>
      </header>

      <section className="pl-stats" aria-label="Progress">
        <ProgressRow
          label="Goals (average)"
          sublabel={goalsSublabel}
          percent={goalsCount > 0 ? goalsAverageProgress : 0}
          barClass="pl-bar-goals"
          valueLabel={goalsCount > 0 ? undefined : "—"}
        />
        {goalsDisplay && goalsDisplay.length > 0 ? (
          <ul className="pl-goal-chips">
            {goalsDisplay.slice(0, 4).map((g) => {
              const p = Math.min(100, Math.max(0, Number(g.progress) || 0));
              const barClass =
                g.type === "unproductive" ? "pl-goal-chip-fill pl-goal-chip-fill--limit" : "pl-goal-chip-fill";
              return (
                <li key={g.id} className="pl-goal-chip">
                  <div className="pl-goal-chip-top">
                    <span className="pl-goal-chip-name" title={g.label}>
                      {g.label}
                    </span>
                    <span className="pl-goal-chip-pct" aria-hidden>
                      {p}%
                    </span>
                  </div>
                  <div
                    className="pl-goal-chip-track"
                    role="progressbar"
                    aria-valuenow={p}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${g.label} progress`}
                  >
                    <div className={barClass} style={{ width: `${p}%` }} />
                  </div>
                  <span className="pl-goal-chip-meta">
                    {g.type === "unproductive" ? "Limit" : "Target"} · {goalChipTimeRatio(g)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="pl-list-wrap">
        <div className="pl-list-head">
          <span>Active sites</span>
          {activeTab ? <span className="pl-list-badge">Live</span> : null}
        </div>
        <ul className="pl-site-list">
            {sortedSites.length === 0 ? (
            <li className="pl-site-empty">No time logged yet — browse to start tracking.</li>
          ) : (
            sortedSites.map(([domain, seconds]) => (
              <li key={domain} className="pl-site-item">
                <span className="pl-site-accent" aria-hidden />
                <img 
                  src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} 
                  alt="" 
                  width={18} 
                  height={18} 
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/icons/icon.png"; // Use extension icon as fallback
                  }}
                />
                <span className="pl-site-domain" title={domain}>
                  {domain}
                </span>
                <span className="pl-site-time">{formatTime(seconds)}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <footer className="pl-footer">
        <button type="button" className="pl-btn pl-btn-primary" onClick={handleDashboard}>
          View dashboard
        </button>
        <button type="button" className="pl-btn pl-btn-secondary" onClick={handleClearData}>
          clear data
        </button>
      </footer>
    </div>
  );
}

export default App;
