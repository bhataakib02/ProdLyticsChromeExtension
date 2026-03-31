/**
 * =====================================================
 * PRODUCTIVITY PLATFORM - BACKGROUND SERVICE WORKER (V3)
 * =====================================================
 * Handles tracking, focus mode blocking, and dashboard syncing.
 * =====================================================
 */

import { API_BASE } from "./buildEnv.js";
import { plFetch } from "./plApi.js";

/** Blocklist may contain full URLs from older clients; compare using hostname only. */
function normalizeBlockedHost(raw) {
    if (!raw || typeof raw !== "string") return "";
    let s = raw.trim().toLowerCase();
    s = s.replace(/\/+$/, "");
    try {
        const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//.test(s);
        const href = hasScheme ? s : `https://${s.replace(/^\/+/, "")}`;
        const u = new URL(href);
        if (!u.hostname) return "";
        return u.hostname.replace(/^www\./, "");
    } catch {
        return s
            .replace(/^https?:\/\//, "")
            .split("/")[0]
            .replace(/^www\./, "");
    }
}

/** Synced time classified unproductive (per local calendar day) before smart-block applies */
const SMART_BLOCK_DAILY_SECONDS = 10800; // 3 hours

function hostsMatch(host, pattern) {
    const p = normalizeBlockedHost(pattern);
    const h = normalizeBlockedHost(host);
    if (!h || !p) return false;
    return h === p || h.endsWith("." + p);
}

function matchesManualBlocklist(host) {
    const h = normalizeBlockedHost(host);
    if (!h || !blocklist?.length) return false;
    return blocklist.some((blockedHost) => hostsMatch(h, blockedHost));
}

function isHostOverUnproductiveLimit(host, unproductiveDaily) {
    const h = normalizeBlockedHost(host);
    if (!h || !unproductiveDaily) return false;
    for (const [site, sec] of Object.entries(unproductiveDaily)) {
        if (sec < SMART_BLOCK_DAILY_SECONDS) continue;
        if (hostsMatch(h, site)) return true;
    }
    return false;
}

async function addUnproductiveTime(host, seconds) {
    const norm = normalizeBlockedHost(host);
    if (!norm || seconds <= 0) return 0;
    const { unproductiveDaily = {}, currentDate } = await chrome.storage.local.get(["unproductiveDaily", "currentDate"]);
    const today = new Date().toDateString();
    let map = { ...unproductiveDaily };
    if (currentDate && currentDate !== today) map = {};
    map[norm] = (map[norm] || 0) + seconds;
    await chrome.storage.local.set({ unproductiveDaily: map });
    return map[norm];
}

async function redirectTabsMatchingHost(hostPattern) {
    const p = normalizeBlockedHost(hostPattern);
    if (!p) return;
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (!tab.id || !tab.url?.startsWith("http")) continue;
            try {
                const h = normalizeBlockedHost(new URL(tab.url).hostname);
                if (hostsMatch(h, p)) {
                    chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
                }
            } catch (e) { /* ignore */ }
        }
    } catch (e) {
        console.warn("redirectTabsMatchingHost:", e);
    }
}

const FLOW_REMINDER_ALARM = "flowReminder";

function mergePreferenceDefaults(raw) {
    return {
        strictMode: true,
        smartBlock: true,
        breakReminders: false,
        focusSessionMinutes: 25,
        breakSessionMinutes: 5,
        deepWorkMinutes: 25,
        breakMinutes: 5,
        ...(raw && typeof raw === "object" ? raw : {}),
    };
}

function clampPreferenceNumber(n, min, max, fallback) {
    const v = Number(n);
    if (!Number.isFinite(v)) return fallback;
    return Math.min(max, Math.max(min, v));
}

function showFlowBreakNotification() {
    const focusMin = clampPreferenceNumber(preferences.focusSessionMinutes, 5, 180, 25);
    const breakMin = clampPreferenceNumber(preferences.breakSessionMinutes, 1, 60, 5);
    const icon = chrome.runtime.getURL("icons/icon.png");
    chrome.notifications.create(`prodlytics-flow-${Date.now()}`, {
        type: "basic",
        iconUrl: icon,
        title: "ProdLytics — time for a break",
        message: `About ${focusMin} min on this focus rhythm. Step away for ~${breakMin} min and reset before your next stretch.`,
        priority: 1,
    });
}

async function scheduleFlowReminderAlarm() {
    await chrome.alarms.clear(FLOW_REMINDER_ALARM);
    if (!preferences.breakReminders) return;
    const focusMin = clampPreferenceNumber(preferences.focusSessionMinutes, 5, 180, 25);
    const period = Math.max(1, Math.round(focusMin));
    chrome.alarms.create(FLOW_REMINDER_ALARM, { periodInMinutes: period });
    console.log(`⏰ Flow reminder every ${period} min (idle-aware)`);
}

/** Add host to dashboard Neural Blocklist (visible + enforced with Strict lock). */
async function addHostToNeuralBlocklist(host) {
    const norm = normalizeBlockedHost(host);
    if (!norm) return;
    if (matchesManualBlocklist(norm)) return;
    try {
        const res = await plFetch(`${API_BASE}/focus`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ website: norm, source: "smart_daily_cap" }),
        });
        if (!res.ok) return;
        const blockRes = await plFetch(`${API_BASE}/focus/`);
        if (blockRes.ok) {
            const data = await blockRes.json();
            blocklist = [...new Set(data.map((site) => normalizeBlockedHost(site.website)).filter(Boolean))];
            await chrome.storage.local.set({ blocklist });
            console.log(`📋 Neural blocklist updated (smart cap): ${norm}`);
        }
    } catch (e) {
        console.warn("addHostToNeuralBlocklist:", e);
    }
}

let activeTab = null;
let activeTitle = "";
let startTime = null;
let lastSaveTime = null;

// Engagement Buffers (Accumulated between saves)
let scrollCount = 0;
let clickCount = 0;
let pageContent = ""; // Stores snippet for AI classification


// Focus Mode State
let blocklist = [];
let preferences = {
    strictMode: true,
    smartBlock: true,
    breakReminders: false,
    focusSessionMinutes: 25,
    breakSessionMinutes: 5,
};

let lastGoalPollMs = 0;

/** Goals + today’s productive stats for the extension popup (throttled; use force on sync). */
async function refreshGoalsAndPopupCache(opts = {}) {
    const { force = false } = opts;
    const now = Date.now();
    if (!force && now - lastGoalPollMs < 90_000) return;
    lastGoalPollMs = now;
    try {
        const [goalsRes, statsRes] = await Promise.all([
            plFetch(`${API_BASE}/goals/progress`),
            plFetch(`${API_BASE}/tracking/stats?range=today`),
        ]);

        let goals = [];
        if (goalsRes.ok) {
            const data = await goalsRes.json();
            if (Array.isArray(data)) goals = data;
        }

        let productiveToday = 0;
        if (statsRes.ok) {
            const stats = await statsRes.json();
            productiveToday = Math.floor(Number(stats.productiveTime) || 0);
        }
        const productiveGoal = goals.find((g) => g.type === "productive");
        if (productiveGoal && typeof productiveGoal.currentSeconds === "number") {
            productiveToday = Math.max(productiveToday, Math.floor(productiveGoal.currentSeconds));
        }

        const { goalProgressSnapshot = {} } = await chrome.storage.local.get("goalProgressSnapshot");
        const nextSnap = { ...goalProgressSnapshot };
        for (const g of goals) {
            const id = String(g._id);
            const prog = typeof g.progress === "number" ? g.progress : 0;
            const prev = goalProgressSnapshot[id];
            if (prev !== undefined && g.isActive && prog >= 100 && prev < 100) {
                const name = String(g.label || g.website || "Your goal").trim() || "Your goal";
                const siteRaw = String(g.website || "").trim();
                const targetHost =
                    siteRaw && siteRaw !== "*"
                        ? siteRaw.replace(/^www\./i, "").toLowerCase()
                        : "";
                await showWorkspaceToastOnActiveTab("Goal achieved", `${name} — you hit today's target.`, "success", {
                    systemNotify: true,
                    targetHost,
                });
            }
            nextSnap[id] = prog;
        }

        const sumProductiveTargets = goals
            .filter((g) => g.type === "productive")
            .reduce((acc, g) => acc + (Number(g.targetSeconds) || 0), 0);
        const focusMin = clampPreferenceNumber(preferences.deepWorkMinutes, 5, 180, 25);
        const defaultFocusTarget = Math.max(3600, focusMin * 60 * 4);
        /* Summed productive targets below ~5m are usually mis-set (e.g. 120s); avoid nonsense denominators. */
        const MIN_SUM_PRODUCTIVE_TARGETS = 5 * 60;
        let focusTargetSeconds;
        if (sumProductiveTargets <= 0) {
            focusTargetSeconds = defaultFocusTarget;
        } else if (sumProductiveTargets < MIN_SUM_PRODUCTIVE_TARGETS) {
            focusTargetSeconds = defaultFocusTarget;
        } else {
            focusTargetSeconds = sumProductiveTargets;
        }

        const focusProgressPercent =
            focusTargetSeconds > 0 ? Math.min(100, Math.round((productiveToday / focusTargetSeconds) * 100)) : 0;

        const goalsAvgProgress =
            goals.length > 0
                ? Math.round(
                    goals.reduce((acc, g) => acc + Math.min(100, Math.max(0, Number(g.progress) || 0)), 0) / goals.length,
                )
                : 0;

        const goalsDisplay = goals.map((g) => ({
            id: String(g._id),
            label: (String(g.label || g.website || "Goal").trim() || "Goal").slice(0, 48),
            type: g.type || "productive",
            progress: Math.min(100, Math.max(0, Number(g.progress) || 0)),
            currentSeconds: Math.floor(Number(g.currentSeconds) || 0),
            targetSeconds: Math.floor(Number(g.targetSeconds) || 0),
        }));

        await chrome.storage.local.set({
            goalProgressSnapshot: nextSnap,
            extensionPopupCache: {
                productiveToday,
                focusTargetSeconds,
                focusProgressPercent,
                goalsAverageProgress: goalsAvgProgress,
                goalsCount: goals.length,
                goalsDisplay,
                updatedAt: Date.now(),
            },
        });
    } catch (err) {
        console.warn("Goals / popup cache refresh:", err?.message || err);
    }
}

/** Bare hostname for goal matching (e.g. youtube.com). */
function normalizeToastTargetHost(raw) {
    if (!raw || typeof raw !== "string") return "";
    const s = raw.trim().toLowerCase().replace(/^www\./, "");
    if (!s || s === "*") return "";
    return s;
}

/** Tab URL host matches goal host (youtube.com, www.youtube.com, m.youtube.com). */
function tabUrlMatchesGoalHost(tabUrl, goalHostNorm) {
    if (!goalHostNorm || !tabUrl) return false;
    try {
        const u = new URL(tabUrl);
        if (!/^https?:$/i.test(u.protocol)) return false;
        const h = u.hostname.toLowerCase().replace(/^www\./, "");
        return h === goalHostNorm || h.endsWith("." + goalHostNorm);
    } catch {
        return false;
    }
}

async function showWorkspaceToastOnActiveTab(title, message, variant = "success", opts = {}) {
    const { systemNotify = false, targetHost: targetHostRaw = "" } = opts;
    const goalHost = normalizeToastTargetHost(targetHostRaw);
    const t = title || "ProdLytics";
    const m = message || "";
    const v = variant || "success";
    const payload = { action: "showWorkspaceToast", title: t, message: m, variant: v };
    let tabDelivered = false;

    async function tryTab(tabId) {
        if (!tabId) return false;
        try {
            await chrome.tabs.sendMessage(tabId, payload);
            return true;
        } catch {
            return false;
        }
    }

    if (goalHost) {
        try {
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                if (tab.id && tabUrlMatchesGoalHost(tab.url || "", goalHost)) {
                    if (await tryTab(tab.id)) tabDelivered = true;
                }
            }
        } catch {
            /* ignore */
        }
    }

    if (!tabDelivered && !goalHost) {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id && /^https?:/i.test(tab.url || "")) {
                if (await tryTab(tab.id)) tabDelivered = true;
            }
        } catch {
            /* ignore */
        }
    }

    if (systemNotify || !tabDelivered) {
        try {
            await chrome.notifications.create(`pl-ws-${Date.now()}`, {
                type: "basic",
                iconUrl: chrome.runtime.getURL("icons/icon.png"),
                title: t,
                message: m,
                priority: 2,
            });
        } catch {
            /* ignore */
        }
    }
}

// Initialization
const initPromise = init();

// ==================== HEARTBEAT ====================

async function heartbeat() {
    let currentSiteTimes = {};
    let currentSyncedTimes = {};

    try {
        const today = new Date().toDateString();
        const storedDateData = await chrome.storage.local.get(["currentDate"]);
        const lastDate = storedDateData.currentDate;

        if (lastDate && lastDate !== today) {
            console.log("🕛 Date changed detected in heartbeat. Performing midnight reset...");

            // Sync final session before wipe
            if (activeTab && startTime) {
                const start = lastSaveTime || startTime;
                const elapsed = (Date.now() - start) / 1000;
                try {
                    const data = await chrome.storage.local.get(["siteTimes"]);
                    const siteTimes = data.siteTimes || {};
                    siteTimes[activeTab] = (siteTimes[activeTab] || 0) + elapsed;
                    await chrome.storage.local.set({ siteTimes });
                } catch (e) { }
            }

            await chrome.storage.local.set({
                siteTimes: {},
                syncedTimes: {},
                unproductiveDaily: {},
                goalProgressSnapshot: {},
                extensionPopupCache: {
                    productiveToday: 0,
                    focusTargetSeconds: 0,
                    focusProgressPercent: 0,
                    goalsAverageProgress: 0,
                    goalsCount: 0,
                    goalsDisplay: [],
                    updatedAt: Date.now(),
                },
                currentDate: today,
                startTime: Date.now(),
                lastSaveTime: null
            });
            activeTab = null;
            startTime = Date.now();
            lastSaveTime = null;
            scrollCount = 0;
            clickCount = 0;
            pageContent = "";
            return; // Start fresh next heartbeat
        } else if (!lastDate) {
            await chrome.storage.local.set({ currentDate: today });
        }
        // 1. Accumulate time for the active tab first
        if (activeTab && startTime) {
            const now = Date.now();
            const start = lastSaveTime || startTime;
            const elapsed = (now - start) / 1000;

            if (elapsed >= 1) { // Only update if at least 1 second passed
                const data = await chrome.storage.local.get(["siteTimes"]);
                currentSiteTimes = data.siteTimes || {};
                currentSiteTimes[activeTab] = (currentSiteTimes[activeTab] || 0) + elapsed;
                await chrome.storage.local.set({ siteTimes: currentSiteTimes });

                lastSaveTime = now;
                await chrome.storage.local.set({ lastSaveTime });
            }
        }

        // 2. Fetch latest data for sync
        const storage = await chrome.storage.local.get(["siteTimes", "syncedTimes"]);
        currentSiteTimes = storage.siteTimes || {};
        currentSyncedTimes = storage.syncedTimes || {};

        for (const site in currentSiteTimes) {
            const totalTime = Math.floor(currentSiteTimes[site]);
            const alreadySynced = Math.floor(currentSyncedTimes[site] || 0);
            const pending = totalTime - alreadySynced;

            if (pending >= 5 || (pending > 0 && !activeTab)) { // Sync if 5s pending or session ended


                // Add engagement data only if it is the current active tab
                let title = "", s = 0, c = 0, pc = "";
                if (site === activeTab) {
                    title = activeTitle;
                    s = scrollCount;
                    c = clickCount;
                    pc = pageContent;
                }

                const success = await saveSession(site, pending, title, s, c, pc);
                if (success) {
                    currentSyncedTimes[site] = (currentSyncedTimes[site] || 0) + pending;
                    await chrome.storage.local.set({ syncedTimes: currentSyncedTimes });

                    // Reset engagement buffers after a successful sync of the active tab
                    if (site === activeTab) {
                        scrollCount = 0;
                        clickCount = 0;
                        pageContent = "";
                    }
                }
            }
        }

        if (activeTab && preferences.smartBlock) {
            const { unproductiveDaily = {} } = await chrome.storage.local.get("unproductiveDaily");
            if (isHostOverUnproductiveLimit(activeTab, unproductiveDaily)) {
                await redirectTabsMatchingHost(activeTab);
            }
        }

        await refreshGoalsAndPopupCache();
    } catch (err) {
        console.error("❌ Heartbeat error:", err);
    }
}


// ==================== CORE TRACKING ====================

/** Prefixes of subdomains that are CDN / asset servers — not worth tracking as separate sites. */
const CDN_SUBDOMAIN_PREFIXES = ["avatars.", "static.", "cdn.", "assets.", "img.", "images.", "media.", "raw.", "objects."];

/**
 * Returns true if this hostname is a CDN subdomain that should not be tracked separately.
 * e.g. avatars.githubusercontent.com → true (skip), en.wikipedia.org → false (track)
 */
function isCdnSubdomain(hostname) {
    if (!hostname) return false;
    const lower = hostname.toLowerCase();
    return CDN_SUBDOMAIN_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function isTrackable(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        if (u.protocol !== "http:" && u.protocol !== "https:") return false;
        if (isCdnSubdomain(u.hostname)) return false;
        return true;
    } catch {
        return false;
    }
}

async function saveSession(website, timeSeconds, pageTitle = "", scrolls = 0, clicks = 0, content = "") {
    if (!website || timeSeconds <= 0) return false;

    try {
        const response = await plFetch(`${API_BASE}/tracking`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                website,
                time: timeSeconds,
                pageTitle: pageTitle || website, // Fallback if no title
                scrolls,
                clicks,
                content
            })
        });

        if (response.ok) {
            const result = await response.json();


            if (result.category === "unproductive") {
                const totalUnproductive = await addUnproductiveTime(website, timeSeconds);
                const prevUnproductive = totalUnproductive - timeSeconds;
                if (preferences.smartBlock && totalUnproductive >= SMART_BLOCK_DAILY_SECONDS) {
                    console.log(`🧠 Smart block: ${website} exceeded ${SMART_BLOCK_DAILY_SECONDS}s unproductive today`);
                    if (prevUnproductive < SMART_BLOCK_DAILY_SECONDS) {
                        await addHostToNeuralBlocklist(website);
                    }
                    await redirectTabsMatchingHost(website);
                }
            }
            return true;
        }
    } catch (err) {
        console.warn(`⚠️ [SYNC] Failed to sync ${website}: ${err.message}`);
    }
    return false;
}


async function handleTabSwitch(url, title = "") {
    await initPromise;

    let nextHost = null;
    try {
        if (isTrackable(url)) nextHost = normalizeBlockedHost(new URL(url).hostname);
    } catch (err) {
        nextHost = null;
    }

    if (activeTab && nextHost && activeTab === nextHost && title === activeTitle) {
        return;
    }

    if (activeTab && startTime) {
        const start = lastSaveTime || startTime;
        const elapsed = (Date.now() - start) / 1000;

        try {
            const data = await chrome.storage.local.get(["siteTimes"]);
            const siteTimes = data.siteTimes || {};
            siteTimes[activeTab] = (siteTimes[activeTab] || 0) + elapsed;
            await chrome.storage.local.set({ siteTimes });
        } catch (err) { }
    }

    lastSaveTime = null;
    scrollCount = 0;
    clickCount = 0;
    pageContent = "";
    chrome.storage.local.remove(["lastSaveTime"]);

    if (!isTrackable(url)) {
        activeTab = null;
        activeTitle = "";
        startTime = null;
        chrome.storage.local.remove(["activeTab", "activeTitle", "startTime"]);
        return;
    }

    if (!nextHost) {
        console.error("❌ Invalid URL for tracking:", url);
        activeTab = null;
        activeTitle = title || "";
        startTime = null;
        chrome.storage.local.remove(["activeTab", "activeTitle", "startTime"]);
        return;
    }

    activeTab = nextHost;
    activeTitle = title || "";
    startTime = Date.now();

    chrome.storage.local.set({ activeTab, activeTitle, startTime });
}


// ==================== FOCUS MODE ENGINE ====================

async function updateSyncData() {
    console.log("🔄 Fetching latest focus data from API...");
    try {
        // 1. Fetch Blocklist
        const blockRes = await plFetch(`${API_BASE}/focus/`);
        if (blockRes.ok) {
            const data = await blockRes.json();
            blocklist = [...new Set(data.map((site) => normalizeBlockedHost(site.website)).filter(Boolean))];
            await chrome.storage.local.set({ blocklist });
            console.log("✅ Blocklist updated:", blocklist);
        }

        // 2. Fetch Preferences
        const prefRes = await plFetch(`${API_BASE}/auth/preferences`);
        if (prefRes.ok) {
            preferences = mergePreferenceDefaults(await prefRes.json());
            await chrome.storage.local.set({ preferences });
            console.log("✅ Preferences updated:", preferences);
        }
        await scheduleFlowReminderAlarm();
    } catch (err) {
        console.warn("⚠️ Sync failed, using cached data:", err.message);
        const cache = await chrome.storage.local.get(["blocklist", "preferences"]);
        if (cache.blocklist) blocklist = cache.blocklist;
        if (cache.preferences) preferences = mergePreferenceDefaults(cache.preferences);
        await scheduleFlowReminderAlarm();
    }
}

/** Manual blocklist (strict) + smart block (3h unproductive / day). */
async function enforceBlocklistOnOpenTabs(options = {}) {
    const waitForInit = options.waitForInit !== false;
    if (waitForInit) await initPromise;
    const { unproductiveDaily = {} } = await chrome.storage.local.get("unproductiveDaily");
    const manualOn = preferences.strictMode && blocklist?.length;
    const smartOn = preferences.smartBlock && Object.values(unproductiveDaily).some((s) => s >= SMART_BLOCK_DAILY_SECONDS);
    if (!manualOn && !smartOn) return;
    try {
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
            if (!tab.id || !tab.url) continue;
            if (tab.url.startsWith("chrome-extension:")) continue;
            try {
                const u = new URL(tab.url);
                if (u.protocol !== "http:" && u.protocol !== "https:") continue;
                const host = normalizeBlockedHost(u.hostname);
                const manualBlock = preferences.strictMode && matchesManualBlocklist(host);
                const smartBlock = preferences.smartBlock && isHostOverUnproductiveLimit(host, unproductiveDaily);
                if (manualBlock || smartBlock) {
                    chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
                }
            } catch (e) { /* ignore invalid URL */ }
        }
    } catch (e) {
        console.warn("enforceBlocklistOnOpenTabs:", e);
    }
}

// Blocking Logic: neural blocklist (strict) OR smart daily cap on unproductive time
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
    if (details.frameId !== 0) return;

    (async () => {
        await initPromise;

        const manualAllowed = preferences.strictMode;
        const smartAllowed = preferences.smartBlock;
        if (!manualAllowed && !smartAllowed) return;

        try {
            const url = new URL(details.url);
            if (url.protocol !== "http:" && url.protocol !== "https:") return;
            const host = normalizeBlockedHost(url.hostname);

            const { unproductiveDaily = {} } = await chrome.storage.local.get("unproductiveDaily");
            const manualBlock = manualAllowed && matchesManualBlocklist(host);
            const smartBlockHit = smartAllowed && isHostOverUnproductiveLimit(host, unproductiveDaily);

            if (manualBlock || smartBlockHit) {
                console.log(`🛡️ Blocking navigation to: ${host} (manual=${manualBlock} smart=${smartBlockHit})`);
                chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("blocked.html") });
            }
        } catch (err) {
            console.error("Blocking error:", err);
        }
    })();
});

// ==================== EVENTS ====================

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "heartbeat") {
        heartbeat();
    } else if (alarm.name === FLOW_REMINDER_ALARM) {
        if (!preferences.breakReminders) return;
        try {
            if (chrome.idle?.queryState) {
                chrome.idle.queryState(180, (state) => {
                    if (state === "active") showFlowBreakNotification();
                });
            } else {
                showFlowBreakNotification();
            }
        } catch (e) {
            console.warn("Flow reminder:", e);
            showFlowBreakNotification();
        }
    } else if (alarm.name === "midnightReset") {
        console.log("🕛 Midnight reset triggered. Syncing and clearing local data...");

        // 1. Save final chunk to local storage
        if (activeTab && startTime) {
            const start = lastSaveTime || startTime;
            const elapsed = (Date.now() - start) / 1000;
            try {
                const data = await chrome.storage.local.get(["siteTimes"]);
                const siteTimes = data.siteTimes || {};
                siteTimes[activeTab] = (siteTimes[activeTab] || 0) + elapsed;
                await chrome.storage.local.set({ siteTimes });
            } catch (err) { }
        }

        // Ideally we would wait for a heartbeat to sync the final chunk, but as a reset
        // we just clear storage. In a robust system, we'd force a sync call here.
        // For now, we wipe both trackers so they start fresh at 0.

        // 2. Clear local storage for tracking
        await chrome.storage.local.set({
            siteTimes: {},
            syncedTimes: {},
            unproductiveDaily: {},
            goalProgressSnapshot: {},
            extensionPopupCache: {
                productiveToday: 0,
                focusTargetSeconds: 0,
                focusProgressPercent: 0,
                goalsAverageProgress: 0,
                goalsCount: 0,
                goalsDisplay: [],
                updatedAt: Date.now(),
            },
        });

        // 3. Reset internal state
        startTime = Date.now();
        lastSaveTime = null;
        scrollCount = 0;
        clickCount = 0;
        pageContent = "";

        await chrome.storage.local.set({ startTime, lastSaveTime: null });

        // 4. Reschedule for next midnight
        scheduleMidnightReset();

        console.log("✅ Midnight reset complete.");
    }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab && tab.url) handleTabSwitch(tab.url, tab.title);
    } catch (err) { }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.active && tab.url) {
        handleTabSwitch(tab.url, tab.title);
    }
});

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === "syncAll") {
        console.log("📩 External syncAll from:", sender.url);
        updateSyncData()
            .then(() => refreshGoalsAndPopupCache({ force: true }))
            .then(() => enforceBlocklistOnOpenTabs())
            .then(() => sendResponse({ success: true, message: "Sync complete" }))
            .catch((err) => sendResponse({ success: false, error: String(err) }));
        return true;
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "syncAll") {
        console.log("📩 syncAll from content/popup");
        updateSyncData()
            .then(() => refreshGoalsAndPopupCache({ force: true }))
            .then(() => enforceBlocklistOnOpenTabs())
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: String(err) }));
        return true;
    }
    if (request.action === "refreshPopupCache") {
        refreshGoalsAndPopupCache({ force: true })
            .then(() => sendResponse({ success: true }))
            .catch((err) => sendResponse({ success: false, error: String(err) }));
        return true;
    }
    if (request.action === "workspaceToastFromDashboard") {
        showWorkspaceToastOnActiveTab(request.title, request.message, request.variant, {
            systemNotify: Boolean(request.systemNotify),
            targetHost: typeof request.targetHost === "string" ? request.targetHost : "",
        })
            .then(() => sendResponse({ ok: true }))
            .catch(() => sendResponse({ ok: false }));
        return true;
    }
    if (request.action === "resetTracking") {
        startTime = Date.now();
        lastSaveTime = null;
        scrollCount = 0;
        clickCount = 0;
        pageContent = "";
        chrome.storage.local.set({ startTime, lastSaveTime: null });
        sendResponse({ success: true });
    } else if (request.action === "pageLoaded") {
        console.log("📄 Page Loaded:", request.url);
        handleTabSwitch(request.url, request.title);
        pageContent = request.content || "";
    } else if (request.action === "titleChanged") {
        console.log("✏️ Title Changed:", request.title);
        activeTitle = request.title;
    } else if (request.action === "engagementActivity") {
        let reqHost = "";
        try {
            reqHost = normalizeBlockedHost(new URL(request.url).hostname);
        } catch (e) { /* ignore */ }
        if (activeTab && reqHost && reqHost === activeTab) {
            scrollCount += request.scrolls || 0;
            clickCount += request.clicks || 0;
        }
    }
});


// ==================== RESET LOGIC ====================

function scheduleMidnightReset() {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0); // Next midnight

    const delayInMinutes = (nextMidnight.getTime() - now.getTime()) / (1000 * 60);

    // Use alarms to trigger at midnight. Alarms are more reliable than setTimeout in service workers.
    chrome.alarms.create("midnightReset", { delayInMinutes });
    console.log(`📅 Next midnight reset scheduled in ${Math.round(delayInMinutes)} minutes.`);
}


// ==================== INIT ====================

async function init() {
    const storage = await chrome.storage.local.get(["activeTab", "activeTitle", "startTime", "blocklist", "preferences", "currentDate", "siteTimes", "syncedTimes"]);

    // ── Bug fix: date-change check on startup ──────────────────────────────────
    // If the worker was idle overnight, siteTimes/syncedTimes may contain stale
    // data from a previous day. Wipe them immediately so phantom sites don't show.
    const today = new Date().toDateString();
    if (storage.currentDate && storage.currentDate !== today) {
        console.log("🕛 [init] Date changed since last run — wiping stale tracking data.");
        await chrome.storage.local.set({
            siteTimes: {},
            syncedTimes: {},
            unproductiveDaily: {},
            goalProgressSnapshot: {},
            currentDate: today,
            lastSaveTime: null,
        });
        // Don't restore any stale activeTab — start fresh
    } else {
        if (!storage.currentDate) {
            await chrome.storage.local.set({ currentDate: today });
        }
        // ── Bug fix: NEVER restore lastSaveTime from storage ─────────────────────
        // If we restore an old lastSaveTime the elapsed window becomes (now - hours_ago)
        // which inflates times massively. Always start fresh; the heartbeat will
        // set it correctly on its first tick.
        if (storage.activeTab && storage.startTime) {
            activeTab = storage.activeTab;
            activeTitle = storage.activeTitle || "";
            // Reset startTime to now so elapsed is measured from worker restart, not
            // the original tab-open time (which may have been hours ago).
            startTime = Date.now();
            lastSaveTime = null;
            await chrome.storage.local.set({ startTime, lastSaveTime: null });
        }
    }

    if (storage.blocklist) blocklist = storage.blocklist;
    if (storage.preferences) preferences = mergePreferenceDefaults(storage.preferences);

    chrome.alarms.create("heartbeat", { periodInMinutes: 0.1 });

    // Initial sync - Await it to ensure we have data before resolving initPromise
    await updateSyncData();
    await refreshGoalsAndPopupCache({ force: true });
    await enforceBlocklistOnOpenTabs({ waitForInit: false });

    // Schedule midnight reset
    scheduleMidnightReset();

    try {
        if (chrome.idle?.setDetectionInterval) {
            chrome.idle.setDetectionInterval(120);
        }
    } catch (e) { /* ignore */ }
}

// Listen for storage changes to keep local variables in sync
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        if (changes.blocklist) blocklist = changes.blocklist.newValue || [];
        if (changes.preferences) {
            preferences = mergePreferenceDefaults(changes.preferences.newValue || preferences);
            scheduleFlowReminderAlarm();
        }

    }
});
