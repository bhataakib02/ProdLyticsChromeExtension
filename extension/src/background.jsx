/**
 * =====================================================
 * PRODUCTIVITY PLATFORM - BACKGROUND SERVICE WORKER (V3)
 * =====================================================
 * Handles tracking, focus mode blocking, and dashboard syncing.
 * =====================================================
 */

const API_URL = "http://localhost:3000/api";
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
    breakReminders: false
};

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
                } catch(e) {}
            }

            await chrome.storage.local.set({
                siteTimes: {},
                syncedTimes: {},
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
                console.log(`📡 [SYNC] Attempting to sync ${pending}s for ${site}`);
                
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
    } catch (err) {
        console.error("❌ Heartbeat error:", err);
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

async function saveSession(website, timeSeconds, pageTitle = "", scrolls = 0, clicks = 0, content = "") {
    if (!website || timeSeconds <= 0) return false;

    try {
        const response = await fetch(`${API_URL}/tracking`, {
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
            console.log(`✅ [SYNC] Successfully uploaded data for ${website}`);
            
            // AI Smart Block Logic
            if (preferences.smartBlock && result.category === "unproductive") {
                const data = await chrome.storage.local.get(["siteTimes"]);
                if (data.siteTimes[website] > 120) {
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    if (tab && tab.url.includes(website)) {
                        chrome.tabs.update(tab.id, { url: chrome.runtime.getURL("blocked.html") });
                    }
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

    if (activeTab && url.includes(activeTab) && title === activeTitle) {
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
        } catch (err) {}
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

    try {
        activeTab = new URL(url).hostname;
    } catch (err) {
        console.error("❌ Invalid URL for tracking:", url);
        activeTab = null;
    }
    activeTitle = title || "";
    startTime = Date.now();

    chrome.storage.local.set({ activeTab, activeTitle, startTime });
}


// ==================== FOCUS MODE ENGINE ====================

async function updateSyncData() {
    console.log("🔄 Fetching latest focus data from API...");
    try {
        // 1. Fetch Blocklist
        const blockRes = await fetch(`${API_URL}/focus/`);
        if (blockRes.ok) {
            const data = await blockRes.json();
            blocklist = data.map(site => site.website.toLowerCase().replace('www.', ''));
            await chrome.storage.local.set({ blocklist });
            console.log("✅ Blocklist updated:", blocklist);
        }

        // 2. Fetch Preferences
        const prefRes = await fetch(`${API_URL}/auth/preferences`);
        if (prefRes.ok) {
            preferences = await prefRes.json();
            await chrome.storage.local.set({ preferences });
            console.log("✅ Preferences updated:", preferences);
        }
    } catch (err) {
        console.warn("⚠️ Sync failed, using cached data:", err.message);
        const cache = await chrome.storage.local.get(["blocklist", "preferences"]);
        if (cache.blocklist) blocklist = cache.blocklist;
        if (cache.preferences) preferences = cache.preferences;
    }
}

// Blocking Logic
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return; // Only block main frame

    await initPromise;

    if (!preferences.strictMode) return;

    try {
        const url = new URL(details.url);
        const host = url.hostname.toLowerCase().replace('www.', '');

        const isBlocked = blocklist.some(blockedHost =>
            host === blockedHost || host.endsWith('.' + blockedHost)
        );

        if (isBlocked) {
            console.log(`🛡️ Blocking access to: ${host}`);
            chrome.tabs.update(details.tabId, { url: chrome.runtime.getURL("blocked.html") });
        }
    } catch (err) {
        console.error("Blocking error:", err);
    }
});

// ==================== EVENTS ====================

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === "heartbeat") {
        heartbeat();
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
            } catch (err) {}
        }

        // Ideally we would wait for a heartbeat to sync the final chunk, but as a reset
        // we just clear storage. In a robust system, we'd force a sync call here.
        // For now, we wipe both trackers so they start fresh at 0.

        // 2. Clear local storage for tracking
        await chrome.storage.local.set({ siteTimes: {}, syncedTimes: {} });

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

chrome.runtime.onMessageExternal.addListener(async (request, sender, sendResponse) => {
    console.log("📩 Received external message:", request.action);
    if (request.action === "syncAll") {
        await updateSyncData();
        sendResponse({ success: true, message: "Sync complete" });
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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
        // Only track engagement for the active tab to avoid crosstalk
        if (activeTab && request.url.includes(activeTab)) {
            scrollCount += request.scrolls || 0;
            clickCount += request.clicks || 0;
            console.log(`🖱️ Activity synced: ${scrollCount}s, ${clickCount}c`);
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
    const storage = await chrome.storage.local.get(["activeTab", "activeTitle", "startTime", "lastSaveTime", "blocklist", "preferences"]);

    if (storage.activeTab && storage.startTime) {
        activeTab = storage.activeTab;
        activeTitle = storage.activeTitle || "";
        startTime = storage.startTime;
        lastSaveTime = storage.lastSaveTime || null;
    }

    if (storage.blocklist) blocklist = storage.blocklist;
    if (storage.preferences) preferences = storage.preferences;

    chrome.alarms.create("heartbeat", { periodInMinutes: 0.1 });

    // Initial sync - Await it to ensure we have data before resolving initPromise
    await updateSyncData();

    // Schedule midnight reset
    scheduleMidnightReset();
}

// Listen for storage changes to keep local variables in sync
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local") {
        if (changes.blocklist) blocklist = changes.blocklist.newValue || [];
        if (changes.preferences) preferences = changes.preferences.newValue || preferences;
        console.log("💾 Storage update detected, local state synced.");
    }
});
