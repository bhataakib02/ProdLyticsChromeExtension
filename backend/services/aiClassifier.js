/**
 * Website category classifier (rule-based).
 * User overrides in the Category collection (source: "user") always win in the tracking API.
 *
 * Policy (defaults):
 * - Learning & work tools + YouTube + AI assistants → productive
 * - Social feeds, shopping, entertainment streaming → unproductive
 * - Everything else → neutral unless title/content keywords tip the scale
 */

const categories = {
    productive: [
        // Video learning (studying on YouTube, etc.)
        "youtube.com",
        "youtu.be",
        // AI / LLM / coding assistants
        "openai.com",
        "chatgpt.com",
        "anthropic.com",
        "claude.ai",
        "perplexity.ai",
        "poe.com",
        "character.ai",
        "gemini.google.com",
        "bard.google.com",
        "copilot.microsoft.com",
        "cursor.com",
        "cursor.sh",
        "aistudio.google.com",
        "notebooklm.google.com",
        // Dev & docs
        "github.com",
        "gitlab.com",
        "bitbucket.org",
        "stackoverflow.com",
        "stackexchange.com",
        "docs.google.com",
        "drive.google.com",
        "notion.so",
        "figma.com",
        "slack.com",
        "zoom.us",
        "trello.com",
        "atlassian.net",
        "jira.com",
        "confluence.com",
        "localhost",
        "codesandbox.io",
        "replit.com",
        "vercel.com",
        "netlify.com",
        "npmjs.com",
        "pypi.org",
        "mdn.mozilla.org",
        "developer.mozilla.org",
        // Learning platforms
        "coursera.org",
        "udemy.com",
        "khanacademy.org",
        "edx.org",
        "pluralsight.com",
        "linkedin.com",
        "linkedinlearning.com",
        "medium.com",
        "dev.to",
        "freecodecamp.org",
        "w3schools.com",
        "geeksforgeeks.org",
        "leetcode.com",
        "hackerrank.com",
        "infosys.com",
        "infyspringboard.onwingspan.com",
        "onwingspan.com",
        "azure.microsoft.com",
        "learn.microsoft.com",
    ],
    unproductive: [
        // Social & feeds
        "facebook.com",
        "fb.com",
        "instagram.com",
        "threads.net",
        "reddit.com",
        "twitter.com",
        "x.com",
        "tiktok.com",
        "snapchat.com",
        "pinterest.com",
        "tumblr.com",
        "discord.com",
        "discordapp.com",
        "web.whatsapp.com",
        "messenger.com",
        // E-commerce & deals
        "amazon.com",
        "amazon.in",
        "amazon.co.uk",
        "amazon.de",
        "amazon.fr",
        "amazon.es",
        "amazon.it",
        "amazon.ca",
        "amazon.com.au",
        "amazon.co.jp",
        "flipkart.com",
        "myntra.com",
        "nykaa.com",
        "snapdeal.com",
        "ebay.com",
        "etsy.com",
        "walmart.com",
        "target.com",
        "bestbuy.com",
        "aliexpress.com",
        "zalando.com",
        "zalando.de",
        "asos.com",
        "shein.com",
        "temu.com",
        "wish.com",
        // Entertainment streaming
        "netflix.com",
        "primevideo.com",
        "hulu.com",
        "disneyplus.com",
        "hotstar.com",
        "twitch.tv",
        "dailymotion.com",
    ],
};

const keywords = {
    productive: [
        "code",
        "programming",
        "documentation",
        "tutorial",
        "learn",
        "course",
        "lecture",
        "api",
        "database",
        "engineering",
        "design",
        "analytics",
        "dashboard",
        "project",
        "management",
        "meeting",
        "deployment",
        "repository",
        "homework",
        "assignment",
        "exam",
        "study",
    ],
    unproductive: [
        "sale",
        "clearance",
        "coupon",
        "checkout",
        "add to cart",
        "free shipping",
        "social",
        "meme",
        "funny",
        "celebrity",
        "gossip",
        "trailer",
        "season finale",
        "episode",
        "reels",
        "for you page",
    ],
};

function hostMatchesDomain(hostname, domain) {
    const h = hostname.toLowerCase();
    const d = domain.toLowerCase().replace(/^\.+/, "");
    if (!d) return false;
    if (d.endsWith(".")) return h === d.slice(0, -1) || h.endsWith("." + d.slice(0, -1));
    return h === d || h.endsWith("." + d);
}

/**
 * Classify a website based on URL, title, and optional content snippet
 */
const classify = (url, title = "", content = "") => {
    let hostname = "";
    try {
        hostname = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
    } catch (err) {
        return { category: "neutral", confidence: 0.5, tags: ["invalid-url"] };
    }
    const lowerTitle = title.toLowerCase();
    const lowerContent = content.toLowerCase();

    if (categories.productive.some((domain) => hostMatchesDomain(hostname, domain))) {
        return { category: "productive", confidence: 0.9, tags: ["work", "learning", "tools"] };
    }
    if (categories.unproductive.some((domain) => hostMatchesDomain(hostname, domain))) {
        return { category: "unproductive", confidence: 0.9, tags: ["social", "shopping", "entertainment"] };
    }

    const prodMatch = keywords.productive.filter((kw) => lowerTitle.includes(kw) || lowerContent.includes(kw));
    const unprodMatch = keywords.unproductive.filter((kw) => lowerTitle.includes(kw) || lowerContent.includes(kw));

    if (prodMatch.length > unprodMatch.length) {
        return { category: "productive", confidence: 0.7, tags: prodMatch };
    }
    if (unprodMatch.length > prodMatch.length) {
        return { category: "unproductive", confidence: 0.7, tags: unprodMatch };
    }

    return { category: "neutral", confidence: 0.5, tags: [] };
};

export default { classify };
