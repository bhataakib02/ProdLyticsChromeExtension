# Chrome Web Store - Privacy Justifications

Copy and paste the below responses directly into the **Privacy** tab of the Chrome Web Store Developer Dashboard.

## Single Purpose

**Single purpose description:**
The single purpose of the ProdLytics extension is to track the user's active browsing time and website usage to provide personalized productivity analytics, goal tracking, and AI-driven insights to help them improve focus.

---

## Permission Justifications

**storage justification:**
Required to save the user's daily goals, local tracking data, custom settings, and cache AI insights to improve performance before syncing with the web app.

**tabs justification:**
Required to read the URL and title of the open tabs so the extension can accurately calculate time spent on specific domains to generate the productivity analytics.

**activeTab justification:**
Required to capture the specific URL and context of the actively viewed tab when the user interacts with the extension popup, enabling contextual goal tracking.

**scripting justification:**
Required to securely inject content scripts into web pages to enforce Focus Mode restrictions, inject "time limit reached" screens, and display on-page habit reminders.

**notifications justification:**
Required to alert the user when they have reached their customized daily productivity goals or when a site time limit has been exceeded.

**idle justification:**
Required to accurately detect when the user steps away from their device so the extension can automatically pause the time tracker, ensuring time analytics are actually accurate.

**alarms justification:**
Required to schedule reliable periodic background tasks that seamlessly sync the user's local tracking data up to their central ProdLytics dashboard.

**webNavigation justification:**
Required to detect at the exact moment a user navigates between different sites, allowing the extension to accurately switch tracking contexts without losing any seconds of data.

**Host permission justification (`<all_urls>`, `https://prodlytics.vercel.app/*`):**
The `<all_urls>` permission is required to analyze time spent across any website the user visits to provide accurate habits analytics. The `prodlytics.vercel.app` permission is required to securely connect with the dedicated product backend to synchronize user data to their personal dashboard.

---

## Remote Code

**Are you using remote code?**
Select: **No, I am not using Remote code**

---

## Data Usage

**What user data do you plan to collect from users now or in the future?**
You will need to check off:
- **Web history** (Because you track the domains the user visits to allocate time metrics)

**I certify that the following disclosures are true:**
Ensure you check off **ALL THREE** boxes at the bottom:
- I do not sell or transfer user data to third parties...
- I do not use or transfer user data for purposes that are unrelated...
- I do not use or transfer user data to determine creditworthiness...

---

## Privacy Policy

**Privacy policy URL:**
If you have a dedicated privacy policy page on your web app, paste it here. If not, use your homepage URL for now, but you should create a basic privacy page on your Vercel deployment:
`https://prodlytics.vercel.app/privacy`
