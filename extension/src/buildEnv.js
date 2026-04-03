/* eslint-disable no-undef -- __DASHBOARD_ORIGIN__ / __API_BASE__ are defined at bundle time (Vite + esbuild). */
/**
 * All dashboard hosts the extension may pair with (one build works for Vercel + local dev).
 * Token sync & API calls pick the origin of an open dashboard tab when possible.
 */
export const DASHBOARD_ORIGINS = [
    "https://prodlytics.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
];
/** Default / fallback dashboard origin (build target). */
export const DASHBOARD_ORIGIN = __DASHBOARD_ORIGIN__;
/** Default API base when no dashboard tab is open. */
export const API_BASE = __API_BASE__;
