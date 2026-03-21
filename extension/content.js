/**
 * Content Script
 * Extracts page title and sends to background for classification
 * Tracks scroll and interaction activity for engagement proxy
 */

const sendPageLoaded = () => {
    if (document.body) {
        chrome.runtime.sendMessage({
            action: "pageLoaded",
            url: window.location.href,
            title: document.title,
            content: document.body.innerText.substring(0, 500) // Send snippet for AI
        });
    } else {
        // Wait for body to be available
        setTimeout(sendPageLoaded, 100);
    }
};

sendPageLoaded();

const observer = new MutationObserver(() => {
    chrome.runtime.sendMessage({
        action: "titleChanged",
        title: document.title,
    });
});

const titleNode = document.querySelector("title");
if (titleNode) {
    observer.observe(titleNode, { childList: true, subtree: true });
}

// Activity Tracking (Scrolls & Clicks)
let scrollCount = 0;
let clickCount = 0;

window.addEventListener("scroll", () => scrollCount++);
window.addEventListener("click", () => clickCount++);

// Send activity metrics every 15 seconds
setInterval(() => {
    if (scrollCount > 0 || clickCount > 0) {
        chrome.runtime.sendMessage({
            action: "engagementActivity",
            scrolls: scrollCount,
            clicks: clickCount,
            url: window.location.href
        });
        scrollCount = 0;
        clickCount = 0;
    }
}, 15000);
