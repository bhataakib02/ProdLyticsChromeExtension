# ProdLytics — Project Report

**Product:** ProdLytics — AI-assisted productivity platform (browser extension + web dashboard + data backend)  
**Document type:** Project summary report  
**Repository:** TimeExt / ProdLytics monorepo  

---

## 1. Purpose

ProdLytics helps knowledge workers and students **see how they use the browser**, **classify time** as productive, neutral, or distracting, and **act** through goals, focus blocklists, a timer, and an **AI Insights** view with cognitive-style metrics and scheduling hints.

---

## 2. Scope

| Component | Description |
|-----------|-------------|
| **Chrome extension (MV3)** | Tracks time on site, engagement signals, syncs with API; enforces focus / smart-block rules where configured. |
| **Next.js dashboard** | Single-page app with Overview, Analytics, Goals, Focus Mode, Timer, AI Insights, Extension Setup. |
| **Backend (shared package)** | MongoDB via Mongoose: tracking, categories, goals, focus blocks, preferences, deep-work sessions. |
| **Classification** | Rule-based `aiClassifier` with domain lists and keywords; user overrides stored per domain. |

---

## 3. Technical summary

- **Frontend / API:** Next.js 16, React 19, Tailwind v4, Framer Motion, D3, Recharts.  
- **Database:** MongoDB (`MONGO_URI` in frontend env for API routes).  
- **Extension:** Vite build → load `extension/dist` unpacked in Chrome; API base `http://localhost:3000/api` (dev).  

Detailed architecture, API tables, and data models: **[docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)** and **[README.md](README.md)**.

---

## 4. Key capabilities

1. **Tracking & categorization** — POST `/api/tracking` with classifier and optional user category overrides.  
2. **Aggregates** — Stats, hourly data, cognitive-load series for insights and charts.  
3. **Goals & focus** — Productive targets, site limits, manual blocklist, preferences sync to extension.  
4. **Deep work** — Timer sessions persisted via `/api/deepwork`.  
5. **AI Insights** — Explanatory copy for demos, recommendations with actions, “tomorrow’s block” suggestion from peak engagement.  

---

## 5. Current limitations (development / demo)

- Single **mock user id** in several API routes until full authentication is implemented.  
- Permissive **CORS** for extension development; should be restricted for production.  
- Insight metrics are **heuristics**, not clinical measures.  

---

## 6. Contributors

The following team members are credited for this project (GitHub usernames):

| # | GitHub |
|---|--------|
| 1 | [@adnaan-dev](https://github.com/adnaan-dev) |
| 2 | [@sradha2474](https://github.com/sradha2474) |
| 3 | [@akeem786](https://github.com/akeem786) |
| 4 | [@saqibmokhtar884](https://github.com/saqibmokhtar884) |
| 5 | [@bhataakib02](https://github.com/bhataakib02) |
| 6 | [@abhishek-134](https://github.com/abhishek-134) |
| 7 | [@satakshik-chaurasia](https://github.com/satakshik-chaurasia) |

**Plain list:** `adnaan-dev`, `sradha2474`, `akeem786`, `saqibmokhtar884`, `bhataakib02`, `abhishek-134`, `satakshik-chaurasia`.

---

## 7. References

- [README.md](README.md) — setup and quick reference  
- [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md) — full technical documentation  

---

*End of report.*
