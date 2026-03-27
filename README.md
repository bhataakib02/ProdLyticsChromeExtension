# ProdLytics

ProdLytics is a full-stack productivity platform that combines a Chrome extension (Manifest V3), a Next.js dashboard, and MongoDB. It tracks browsing behavior, classifies activity, computes focus indicators, and provides actionable tools such as goals, blocklists, and deep-work sessions.

## Overview

ProdLytics is designed around a simple loop:

1. **Capture** browsing activity and interaction signals.
2. **Interpret** behavior using classification and analytics.
3. **Act** with focused workflows (Goals, Focus Mode, Timer, Insights).

This repository contains all project components required for local development and demonstration.

## Documentation

- Technical documentation: [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md)
- Software Requirements Specification: [docs/SRS.md](docs/SRS.md)
- Project report: [report.md](report.md)

If `docs/SRS.md` ever appears with escaped newlines or broken dashes after a merge:

```bash
python docs/fix_srs_encoding.py
```

## Repository Structure

| Directory | Purpose |
|---|---|
| `frontend/` | Next.js 16 dashboard and API routes under `src/app/api/` |
| `backend/` | Shared package for MongoDB connector, models, and classifier logic |
| `extension/` | Chrome extension source; production output is `extension/dist/` |
| `docs/` | Technical docs, SRS, and supporting project material |

## Architecture

```mermaid
flowchart LR
    EXT[Chrome Extension] -->|REST| API[Next.js API]
    UI[Dashboard] -->|REST| API
    API -->[(MongoDB)]
    UI -.->|postMessage| EXT
```

## Tech Stack

- Frontend/API: Next.js 16, React 19, Tailwind CSS v4, Framer Motion, D3, Recharts
- Backend/Data: MongoDB, Mongoose
- Extension: Manifest V3, Vite

## Prerequisites

- Node.js 20+
- npm 10+
- MongoDB local instance or Atlas URI
- Google Chrome (or Chromium)

## Environment Setup

Create `frontend/.env.local` with:

```env
MONGO_URI=mongodb://127.0.0.1:27017/prodlytics
```

Use a valid connection string for your local/Atlas environment and keep env files out of source control.

## Quick Start

1) Install dependencies from repo root:

```bash
npm run install:all
```

2) Start dashboard:

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

3) Build extension:

```bash
cd extension
npm run
```

4) Load extension in Chrome:

- Open `chrome://extensions`
- Enable **Developer mode**
- Click **Load unpacked**
- Select `extension/dist`

After extension code changes, run `npm run build` again and reload the extension.

## Root Scripts

- `npm run install:all` - install dependencies for all subprojects
- `npm run dev` - run frontend and extension development mode together
- `npm run build:ext` - build extension artifacts from root

## Verification Before Submission

Run:

` build``bash
cd frontend
npm run lint
npm run build
```

```bash
cd extension
npm run lint
npm run build
```

Submission-ready state:
- all lint commands pass
- all production builds pass
- extension loads from `extension/dist`

## API Summary

API handlers are implemented in `frontend/src/app/api/`.

- `POST /api/tracking` - ingest browsing and engagement data
- `GET /api/tracking/stats?range=today|yesterday|week|month` - aggregate metrics and score
- `GET /api/tracking/cognitive-load` - hourly load-style signal series
- `GET|PUT /api/auth/preferences` - user focus/timer preferences
- `GET|POST|PUT|DELETE /api/goals` and `GET /api/goals/progress`
- `GET|POST|DELETE /api/focus` - blocklist management
- `GET|POST /api/deepwork` - deep-work session history

For full endpoint contracts and schema details, see [docs/PROJECT_DOCUMENTATION.md](docs/PROJECT_DOCUMENTATION.md).

## Troubleshooting

**MongoDB connection fails**
- verify `MONGO_URI` in `frontend/.env.local`
- verify MongoDB/Atlas connectivity and credentials

**Extension not syncing**
- ensure frontend is running at `http://localhost:3000`
- rebuild extension and reload it in `chrome://extensions`

**Works on one laptop, fails on another**
- confirm Node.js 20+ and npm 10+
- run `npm run install:all`
- ensure `frontend/.env.local` exists on that machine

## Notes for Review and Demo

- Some routes still use a fixed mock user id for development scenarios.
- CORS is intentionally permissive for local extension integration.
- Cognitive-style metrics are heuristic productivity indicators, not medical diagnostics.

## Contributors

| GitHub |
|---|
| [@adnaan-dev](https://github.com/adnaan-dev) |
| [@sradha2474](https://github.com/sradha2474) |
| [@akeem786](https://github.com/akeem786) |
| [@saqibmokhtar884](https://github.com/saqibmokhtar884) |
| [@bhataakib02](https://github.com/bhataakib02) |
| [@abhishek-134](https://github.com/abhishek-134) |
| [@satakshik-chaurasia](https://github.com/satakshik-chaurasia) |

## License

Use the repository license file at project root (for example `LICENSE`) if present.
