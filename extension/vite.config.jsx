import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function resolveDashboardOrigin(mode) {
    const loaded = loadEnv(mode, process.cwd(), ["PRODLYTICS_", "VITE_"]);
    const fromEnv =
        process.env.PRODLYTICS_DASHBOARD_ORIGIN ||
        loaded.PRODLYTICS_DASHBOARD_ORIGIN ||
        loaded.VITE_PRODLYTICS_DASHBOARD_ORIGIN;
    if (fromEnv) return fromEnv.replace(/\/+$/, "");
    if (mode === "development") return "http://localhost:3000";
    if (process.env.PRODLYTICS_EXTENSION_TARGET === "development") return "http://localhost:3000";
    return "https://prodlytics.vercel.app";
}

// Popup-only Vite config. background.js and content.js are built in build.js via esbuild.
export default defineConfig(({ mode }) => {
    const dashboardOrigin = resolveDashboardOrigin(mode);
    const apiBase = `${dashboardOrigin}/api`;
    return {
        publicDir: false,
        plugins: [react()],
        base: "",
        define: {
            __DASHBOARD_ORIGIN__: JSON.stringify(dashboardOrigin),
            __API_BASE__: JSON.stringify(apiBase),
        },
        build: {
            outDir: "dist",
            emptyOutDir: true,
        },
    };
});
