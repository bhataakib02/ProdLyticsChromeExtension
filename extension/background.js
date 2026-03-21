/**
 * =====================================================
 * PRODUCTIVITY PLATFORM - BACKGROUND SERVICE WORKER (V3)
 * =====================================================
 * Handles time tracking, Deep Work, Focus Mode,
 * and authenticated API communication.
 * =====================================================
 */

const API_URL = "http://localhost:5010/api";
let activeTab = null;
let activeTitle = "";
let startTime = null;
let lastSaveTime = null;
let blocklist = [];
let tabSwitches = 0; // Track tab switching frequency
let idleTimeMins = 0; // Track idle time
let isIdle = false;

// Initialization guard
let initialized = false;
const initPromise = init();

// ==================== HEARTBEAT ====================

async function heartbeat() {
    if (activeTab && startTime) {
        const now = Date.now();
        const start = lastSaveTime || startTime;
        const elapsed = (now - start) / 1000;

        if (elapsed >= 30) { // Save every 30+ seconds
            await saveSession(activeTab, Math.floor(elapsed), activeTitle);
            lastSaveTime = now;
            chrome.storage.local.set({ lastSaveTime });
        }
    }
}

// ==================== AUTH HELPERS ====================

async function getAuthToken() {
    const data = await chrome.storage.local.get(["accessToken"]);
    return data.accessToken;
}

async function authenticatedFetch(endpoint, options = {}) {
    try {
        const token = await getAuthToken();
        const headers = {
            "Content-Type": "application/json",
            "X-Auth-Token": token || "",
            "Authorization": token ? `Bearer ${token}` : "",
            ...options.headers,
        };

        const fullUrl = `${API_URL}${endpoint}`;
        console.log(`🌐 Fetching: ${fullUrl}`);
        const response = await fetch(fullUrl, { ...options, headers });

        if (response.status === 401) {
            console.warn("Unauthorized API call. Token might be expired.");
        }

        return response;
    } catch (err) {
        console.error(`Fetch error at ${endpoint}:`, err);
        throw err;
    }
}

// ==================== CORE TRACKING ====================

function isTrackable(url) {
    if (!url) return false;
    try {
        const u = new URL(url);
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

async function saveSession(website, timeSeconds, pageTitle = "") {
    console.log(`🔍 Attempting to save session: ${website} (${timeSeconds}s)`);
    if (!website || timeSeconds < 2) {
        console.log("⚠️ Session too short or website missing, skipping.");
        return;
    }

    try {
        const res = await authenticatedFetch("/tracking", {
            method: "POST",
            body: JSON.stringify({ website, time: timeSeconds, pageTitle }),
        });

        if (res.ok) {
            console.log(`✅ Tracked successfully: ${website} (${timeSeconds}s)`);
        } else {
            console.error(`❌ Tracking failed with status: ${res.status}`);
            // Save locally if offline or error
            const { offlineData } = await chrome.storage.local.get(["offlineData"]);
            const offline = offlineData || [];
            offline.push({ website, time: timeSeconds, pageTitle, date: Date.now() });
            await chrome.storage.local.set({ offlineData: offline });
            console.log("💾 Saved session to offline storage.");
        }
    } catch (err) {
        console.error("❌ Tracking API error:", err);
    }
}

async function handleTabSwitch(url, title = "") {
    await initPromise; // Ensure we have loaded state

    // If it's the same hostname and title, skip redundant calls (within 1s)
    if (activeTab && url.includes(activeTab) && title === activeTitle) {
        return;
    }

    // Save previous session
    if (activeTab && startTime) {
        const start = lastSaveTime || startTime;
        const elapsed = (Date.now() - start) / 1000;
        await saveSession(activeTab, Math.floor(elapsed), activeTitle);
    }

    lastSaveTime = null;
    chrome.storage.local.remove("lastSaveTime");

    if (!isTrackable(url)) {
        activeTab = null;
        activeTitle = "";
        startTime = null;
        chrome.storage.local.remove(["activeTab", "activeTitle", "startTime"]);
        return;
    }

    activeTab = new URL(url).hostname;
    activeTitle = title || "";
    startTime = Date.now();
    tabSwitches++;

    // Check cognitive load periodically
    if (tabSwitches % 5 === 0) {
        authenticatedFetch("/ai/cognitive-load", {
            method: "POST",
            body: JSON.stringify({
                tab_switches_per_min: tabSwitches / 5, // rough estimate
                idle_time_percentage: idleTimeMins / 60,
                session_length_mins: (Date.now() - (lastSaveTime || startTime)) / 60000
            })
        }).then(res => res.json()).then(data => {
            if (data.burnout_risk === "High") {
                chrome.notifications.create("burnout-warning", {
                    type: "basic",
                    iconUrl: "icons/icon128.png",
                    title: "🧠 High Cognitive Load",
                    message: data.recommendation,
                    priority: 2,
                });
            }
        }).catch(e => console.error(e));
    }

    // Persist state for recovery
    chrome.storage.local.set({ activeTab, activeTitle, startTime, tabSwitches });

    // Check Focus Mode
    checkFocusMode(activeTab);
}

// ==================== IDLE DETECTION ====================
chrome.idle.setDetectionInterval(60);
chrome.idle.onStateChanged.addListener((newState) => {
    console.log(`Idle state changed to: ${newState}`);
    if (newState === 'idle' || newState === 'locked') {
        isIdle = true;
        idleTimeMins += 1;
    } else {
        isIdle = false;
    }
});

// ==================== FOCUS MODE ====================

async function checkFocusMode(hostname) {
    const { focusModeEnabled } = await chrome.storage.local.get(["focusModeEnabled"]);
    if (!focusModeEnabled) return;

    const { blocklist: storedBlocklist } = await chrome.storage.local.get(["blocklist"]);
    const isBlocked = storedBlocklist && storedBlocklist.some(site => hostname.includes(site));

    if (isBlocked) {
        chrome.notifications.create("focus-block", {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "🚫 Focus Mode Active",
            message: `${hostname} is on your blocklist. Stay focused!`,
            priority: 2,
        });
    }
}

async function syncBlocklist() {
    try {
        const res = await authenticatedFetch("/focus");
        if (res.ok) {
            const list = await res.json();
            const blacklist = list.map(b => b.website);
            await chrome.storage.local.set({ blocklist: blacklist });
            console.log("✅ Blocklist synced:", blacklist.length, "sites");
        }
    } catch (err) {
        console.warn("Could not sync blocklist");
    }
}

// ==================== ALARMS & EVENTS ====================

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "deepWork") {
        const { deepWorkState, deepWorkSessionId } = await chrome.storage.local.get(["deepWorkState", "deepWorkSessionId"]);
        const isWork = deepWorkState === "work";

        // Update backend
        if (deepWorkSessionId) {
            authenticatedFetch(`/deepwork/end/${deepWorkSessionId}`, {
                method: "PUT",
                body: JSON.stringify({ completed: true, actualMinutes: isWork ? 25 : 5 }) // Simplification
            });
        }

        chrome.notifications.create("deepwork-finished", {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: isWork ? "🎉 Deep Work Session Finished" : "☕ Break Finished",
            message: isWork ? "Time for a short break!" : "Back to work!",
            requireInteraction: true,
        });

        await chrome.storage.local.set({
            deepWorkState: isWork ? "break" : "idle",
            deepWorkActive: false,
            deepWorkSessionId: null
        });
    } else if (alarm.name === "sync-blocklist") {
        syncBlocklist();
    } else if (alarm.name === "heartbeat") {
        heartbeat();
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

// Save session when browser window is closed
chrome.windows.onRemoved.addListener(async () => {
    if (activeTab && startTime) {
        const start = lastSaveTime || startTime;
        const elapsed = (Date.now() - start) / 1000;
        await saveSession(activeTab, Math.floor(elapsed), activeTitle);
        activeTab = null;
        startTime = null;
        lastSaveTime = null;
        chrome.storage.local.remove(["activeTab", "activeTitle", "startTime", "lastSaveTime"]);
    }
});

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
    if (request.action === "pageLoaded") {
        // Classify the page content asynchronously
        authenticatedFetch("/ai/classify", {
            method: "POST",
            body: JSON.stringify({ url: request.url, title: request.title, content: request.content || "" })
        }).then(res => res.json()).then(data => {
            console.log("🧠 AI Classification:", data);
        }).catch(err => console.error(err));
    } else if (request.action === "engagementActivity") {
        console.log(`Engagement on ${request.url} -> Scrolls: ${request.scrolls}, Clicks: ${request.clicks}`);
    } else if (request.action === "syncAll") {
        syncBlocklist().then(() => sendResponse({ success: true }));
        return true;
    } else if (request.action === "startDeepWork") {
        const minutes = request.minutes || 25;
        chrome.alarms.create("deepWork", { delayInMinutes: minutes });

        // Start session in backend
        authenticatedFetch("/deepwork/start", {
            method: "POST",
            body: JSON.stringify({
                type: "work",
                durationMinutes: minutes,
                website: activeTab || ""
            })
        }).then(async res => {
            if (res.ok) {
                const session = await res.json();
                chrome.storage.local.set({
                    deepWorkActive: true,
                    deepWorkState: "work",
                    deepWorkEndTime: Date.now() + minutes * 60000,
                    deepWorkSessionId: session._id
                });
                console.log("✅ Deep Work session started in backend:", session._id);
            } else {
                console.warn(`⚠️ Backend failed to start deep work: ${res.status}`);
            }
        }).catch(err => console.error("Could not start deep work in backend:", err));

        sendResponse({ success: true });
        return false;
    }
});

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    if (request.action === "setToken" && request.token) {
        chrome.storage.local.set({ accessToken: request.token }, () => {
            console.log("✅ Auth token received from dashboard");
            syncBlocklist();
            sendResponse({ success: true });
        });
        return true;
    }
});

// ==================== INIT ====================

async function init() {
    console.log("🚀 Initialization starting...");
    const storage = await chrome.storage.local.get(["activeTab", "activeTitle", "startTime", "lastSaveTime"]);

    if (storage.activeTab && storage.startTime) {
        activeTab = storage.activeTab;
        activeTitle = storage.activeTitle || "";
        startTime = storage.startTime;
        lastSaveTime = storage.lastSaveTime || null;
        console.log(`📡 Resumed tracking: ${activeTab}`);
    }

    syncBlocklist();

    // Use Alarms for periodic sync (more reliable in V3)
    chrome.alarms.create("sync-blocklist", { periodInMinutes: 10 });
    chrome.alarms.create("heartbeat", { periodInMinutes: 1 });

    initialized = true;
    console.log("✅ Initialization complete");
}
