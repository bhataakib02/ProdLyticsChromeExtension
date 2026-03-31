# Chrome Web Store — copy for ProdLytics

**Step-by-step checklist:** see **`PUBLISH_CHECKLIST.md`** in this folder.

Use the sections below in the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Item name (max ~75 characters)

**ProdLytics — AI Productivity & Focus**

---

## Short description (132 characters max)

Track focus time & site habits; sync goals & blocklist with your ProdLytics dashboard. Private to your account.

---

## Detailed description (store listing — paste & edit)

**ProdLytics** helps you see how you actually spend time in the browser and stay on top of your goals.

**What you get**

- **Automatic time tracking** by site, synced to your ProdLytics dashboard  
- **Goals and focus tools** (including blocklist / focus flows where enabled)  
- **Insights** that summarize your day—not generic advice with no data  

**How it works**

The extension runs in the background and records **which sites you use** and **how long** you stay on them, then sends summaries to **your** ProdLytics account. Open the dashboard to see charts, goals, and settings. You can use Google sign-in on the dashboard or an anonymous session tied to your browser.

**Privacy**

We don’t sell your browsing history. Data is tied to **your account** and used only to power ProdLytics. Read our full **Privacy Policy**: **https://prodlytics.vercel.app/privacy-policy**  
*(After deploy, open that URL once to confirm it loads. If you use a custom domain, use `https://<your-domain>/privacy-policy` everywhere instead.)*

**Why broad site access**

To measure time per website and apply your blocklist across the web, Chrome requires access to **regular browsing URLs**. We only use this for ProdLytics features you enable—not for unrelated advertising.

---

## Single purpose

**One sentence for the “single purpose” field:**

Help the user measure and improve productivity by tracking time on websites, syncing with their ProdLytics dashboard, and applying focus/blocking rules they configure.

---

## Justification: Host permissions / `<all_urls>`

Paste into **“Justification for host permissions”** or similar (adjust length if the form limits characters):

> ProdLytics measures **time spent per hostname** and syncs that data to the user’s ProdLytics account. To detect tab changes and navigation on normal websites, the extension needs network access to **http and https pages** the user visits. The official ProdLytics dashboard (`https://prodlytics.vercel.app/*`) is listed explicitly for session sync. We do not inject ads; data is used only for productivity features the user sees in the dashboard and extension.

---

## Justification: Content scripts on all http(s) sites

> A **content script** runs on pages the user visits so the extension can read **page title** and **light engagement signals** (e.g. scroll/click counts) used for focus insights, and to **bridge** session tokens with the open ProdLytics dashboard tab when the user uses that site. Scripts are limited to what ProdLytics needs for tracking and sync—not for mining unrelated page content.

---

## Permission declarations (copy into “Permission justifications” or your notes)

Use one line per permission as Chrome asks.

| Permission        | User-facing justification |
|-------------------|---------------------------|
| **storage**       | Saves your session token, goals, blocklist, and cached stats locally so the extension works quickly and stays in sync with the dashboard. |
| **tabs**          | Detects which tab is active and its URL so we can attribute time to the correct site and open the dashboard when you choose. |
| **activeTab**     | Allows safe, user-context access to the current tab when needed for optional actions tied to what you’re viewing. |
| **notifications** | Shows optional reminders (e.g. breaks or focus nudges) that you can control in Chrome settings. |
| **idle**          | Detects when the computer is idle so tracked time reflects active use rather than long idle periods. |
| **alarms**        | Schedules periodic sync, daily resets, and reminder timers in the background service worker. |
| **webNavigation** | Detects navigations to blocked or limited sites so focus/blocking rules can apply reliably. |

**Note:** Unused permissions were removed from `manifest.json` (`scripting`, `identity`). If you add features later (e.g. programmatic injection, Google identity in the extension), add the permission back **and** update this table.

---

## Data disclosure checklist (Privacy tab in CWS)

Typical answers for ProdLytics (confirm against your actual build):

- **Personally identifiable information** — Yes (account email if user signs in with Google; anonymous ID otherwise).  
- **Health / financial** — No (unless you add such features).  
- **Location** — No (unless you add explicit location features).  
- **Web history** — Yes (domains/time; described in privacy policy).  
- **User activity** — Yes (time on sites, engagement proxies for insights).  
- **Website content** — Limited (titles; not full page content for unrelated purposes—align with your real code).  

Always match these answers to **what the extension actually does**.

---

## Screenshots & assets (checklist)

- At least **1** screenshot (1280×800 or 640×400 recommended).  
- **128×128** icon (you have `icons/icon.png`; ensure it’s sharp at 128).  
- Optional: **small promo tile** 440×280.  

---

## After you publish the privacy policy

1. Put `PRIVACY_POLICY.md` online (see `GITHUB_PAGES.md` in this folder for one easy option).  
2. Copy the **final URL** into the store **Privacy policy** field.  
3. Keep the policy URL **stable**; if you move it, update the store listing.
