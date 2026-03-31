import React, { useState, useEffect, useCallback } from "react";
import "./App.css";
import { DASHBOARD_ORIGIN } from "./buildEnv.js";

const defaultCache = {
  productiveToday: 0,
  focusTargetSeconds: 0,
  focusProgressPercent: 0,
  goalsAverageProgress: 0,
  goalsCount: 0,
  goalsDisplay: [],
  updatedAt: 0,
};

function formatTime(seconds) {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  const mRemaining = m % 60;
  return `${h}h ${mRemaining}m`;
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

function App() {
  const [siteTimes, setSiteTimes] = useState({});
  const [activeTab, setActiveTab] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [popupCache, setPopupCache] = useState(defaultCache);

  const applyThemeToChrome = useCallback((dark) => {
    if (typeof document !== "undefined") {
      document.body.classList.toggle("pl-popup--light", !dark);
      document.body.classList.toggle("pl-popup--dark", dark);
      document.body.style.backgroundColor = dark ? "#0c0e14" : "#eef0f4";
    }
  }, []);

  const readStorage = useCallback(() => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    chrome.storage.local.get(
      ["siteTimes", "activeTab", "startTime", "lastSaveTime", "preferences", "isDarkMode", "extensionPopupCache", "currentDate"],
      (data) => {
        // Bug fix: if the background worker hasn't done its midnight reset yet,
        // the stored siteTimes belong to a previous day. Don't display them.
        const today = new Date().toDateString();
        const isStaleDate = data.currentDate && data.currentDate !== today;
        let times = isStaleDate ? {} : (data.siteTimes || {});

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
          times = { ...times, [data.activeTab]: (times[data.activeTab] || 0) + elapsed };
        }
        setSiteTimes(times);
        setActiveTab(isStaleDate ? null : data.activeTab);

        if (data.extensionPopupCache && typeof data.extensionPopupCache === "object") {
          setPopupCache({ ...defaultCache, ...data.extensionPopupCache });
        }
      },
    );
  }, [applyThemeToChrome]);

  useEffect(() => {
    readStorage();
    try {
      chrome.runtime.sendMessage({ action: "refreshPopupCache" });
    } catch {
      /* ignore */
    }
    const interval = setInterval(readStorage, 1000);
    return () => clearInterval(interval);
  }, [readStorage]);

  useEffect(() => {
    applyThemeToChrome(isDarkMode);
  }, [isDarkMode, applyThemeToChrome]);

  useEffect(() => {
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
  }, [readStorage]);

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
    const dashboardUrl = DASHBOARD_ORIGIN;
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
      ? `${goalsCount} active objective${goalsCount === 1 ? "" : "s"}`
      : "Create objectives in the dashboard";

  return (
    <div className={`pl-popup ${isDarkMode ? "pl-popup--dark" : "pl-popup--light"}`}>
      <header className="pl-header">
        <div>
          <h1 className="pl-title">ProdLytics</h1>
          <p className="pl-popup-hint">
            Your stats and goals stay on this browser only—nothing to sign in. Each install gets its own private
            space on the server.
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
            {goalsDisplay.slice(0, 4).map((g) => (
              <li key={g.id} className="pl-goal-chip">
                <span className="pl-goal-chip-name" title={g.label}>
                  {g.label}
                </span>
                <span className="pl-goal-chip-meta">
                  {g.type === "unproductive" ? "Limit" : "Target"} · {Math.min(100, Math.max(0, g.progress))}%
                </span>
              </li>
            ))}
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
                <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={18} height={18} />
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
