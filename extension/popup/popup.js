/**
 * AERO PRODUCTIVITY - POPUP LOGIC
 */

document.addEventListener("DOMContentLoaded", async () => {
    const scoreVal = document.getElementById("scoreValue");
    const currentSite = document.getElementById("currentSite");
    const elapsedTime = document.getElementById("elapsedTime");
    const focusToggle = document.getElementById("focusModeToggle");
    const pomoBtn = document.getElementById("pomoBtn");
    const pomoTimer = document.getElementById("pomoTimer");
    const scoreMeter = document.querySelector(".meter");
    const dashboardBtn = document.getElementById("dashboardBtn");

    // ==================== INITIAL DATA ====================

    function updateUI() {
        chrome.storage.local.get(
            ["activeTab", "startTime", "productivityScore", "focusModeEnabled", "deepWorkActive", "deepWorkEndTime"],
            (data) => {
                // Update Current Site
                if (data.activeTab) {
                    currentSite.textContent = data.activeTab;
                    updateElapsedTime(data.startTime);
                } else {
                    currentSite.textContent = "Not Tracking";
                    elapsedTime.textContent = "00:00:00";
                }

                // Update Score
                const score = data.productivityScore || 0;
                scoreVal.textContent = score;
                const offset = 283 - (283 * score) / 100;
                scoreMeter.style.strokeDashoffset = offset;

                // Update Focus Mode
                focusToggle.checked = !!data.focusModeEnabled;

                // Update Deep Work
                if (data.deepWorkActive) {
                    pomoBtn.textContent = "STOP";
                    pomoBtn.classList.add("danger");
                    startPomoUIUpdate(data.deepWorkEndTime);
                } else {
                    pomoBtn.textContent = "START";
                    pomoBtn.classList.remove("danger");
                    pomoTimer.textContent = "25:00";
                }
            }
        );
    }

    function updateElapsedTime(startTime) {
        if (!startTime) return;
        const seconds = Math.floor((Date.now() - startTime) / 1000);
        const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
        const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        elapsedTime.textContent = `${h}:${m}:${s}`;
    }

    // ==================== EVENT LISTENERS ====================

    focusToggle.addEventListener("change", (e) => {
        const enabled = e.target.checked;
        chrome.storage.local.set({ focusModeEnabled: enabled }, () => {
            chrome.runtime.sendMessage({ action: "syncAll" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("Could not sync with background:", chrome.runtime.lastError.message);
                }
            });
        });
    });

    pomoBtn.addEventListener("click", () => {
        chrome.storage.local.get(["deepWorkActive"], (data) => {
            if (data.deepWorkActive) {
                // Stop Deep Work
                chrome.alarms.clear("deepWork");
                chrome.storage.local.set({ deepWorkActive: false });
                updateUI();
            } else {
                // Start Deep Work
                chrome.runtime.sendMessage({ action: "startDeepWork", minutes: 25 }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("Deep Work error:", chrome.runtime.lastError.message);
                    } else if (response && response.success) {
                        updateUI();
                    }
                });
            }
        });
    });

    dashboardBtn.addEventListener("click", () => {
        chrome.tabs.create({ url: "http://localhost:3000" });
    });

    // ==================== REAL-TIME UPDATES ====================

    setInterval(() => {
        chrome.storage.local.get(["startTime", "activeTab"], (data) => {
            if (data.activeTab && data.startTime) {
                updateElapsedTime(data.startTime);
            }
        });
    }, 1000);

    let pomoInterval;
    function startPomoUIUpdate(endTime) {
        if (pomoInterval) clearInterval(pomoInterval);
        pomoInterval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            const m = Math.floor(remaining / 60).toString().padStart(2, "0");
            const s = (remaining % 60).toString().padStart(2, "0");
            pomoTimer.textContent = `${m}:${s}`;
            if (remaining <= 0) {
                clearInterval(pomoInterval);
                updateUI();
            }
        }, 1000);
    }

    updateUI();
});
