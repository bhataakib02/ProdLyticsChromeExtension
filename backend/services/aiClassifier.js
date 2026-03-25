/**
 * AI Classifier Service
 * Categorizes websites based on URL and page title using keywords
 */

const categories = {
    productive: [
        "github.com",
        "stackoverflow.com",
        "docs.google.com",
        "notion.so",
        "figma.com",
        "slack.com",
        "zoom.us",
        "trello.com",
        "jira.com",
        "localhost",
        "codesandbox.io",
        "replit.com",
        "linkedin.com", // can be argued, but often professional
        "medium.com",
        "dev.to",
        "infosys.com",
        "infyspringboard.onwingspan.com",
        "onwingspan.com",
        "azure.microsoft.com",
    ],
    unproductive: [
        "youtube.com",
        "facebook.com",
        "instagram.com",
        "reddit.com",
        "twitter.com",
        "x.com",
        "netflix.com",
        "twitch.tv",
        "tiktok.com",
        "discord.com",
        "pinterest.com",
        "amazon.com",
        "ebay.com",
        "disneyplus.com",
        "hulu.com",
    ],
};

const keywords = {
    productive: ["code", "programming", "documentation", "tutorial", "learn", "course", "api", "database", "engineering", "design", "analytics", "dashboard", "project", "management", "meeting", "deployment", "repository"],
    unproductive: ["video", "movie", "series", "social", "chat", "game", "shopping", "sales", "deal", "meme", "funny", "celebrity", "gossip", "trailer", "streaming"],
};

/**
 * Classify a website based on URL, title, and optional content snippet
 */
const classify = (url, title = "", content = "") => {
    let hostname = "";
    try {
        hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
    } catch (err) {
        return { category: "neutral", confidence: 0.5, tags: ["invalid-url"] };
    }
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();


    // 1. Direct match on hostname
    if (categories.productive.some(domain => hostname.includes(domain))) {
        return { category: "productive", confidence: 0.9, tags: ["work", "professional"] };
    }
    if (categories.unproductive.some(domain => hostname.includes(domain))) {
        return { category: "unproductive", confidence: 0.9, tags: ["entertainment", "social"] };
    }

    // 2. Keyword match in title and content
    const prodMatch = keywords.productive.filter(kw => lowerTitle.includes(kw) || lowerContent.includes(kw));
    const unprodMatch = keywords.unproductive.filter(kw => lowerTitle.includes(kw) || lowerContent.includes(kw));


    if (prodMatch.length > unprodMatch.length) {
        return { category: "productive", confidence: 0.7, tags: prodMatch };
    }
    if (unprodMatch.length > prodMatch.length) {
        return { category: "unproductive", confidence: 0.7, tags: unprodMatch };
    }

    // 3. Fallback to neutral
    return { category: "neutral", confidence: 0.5, tags: [] };
};

export default { classify };
