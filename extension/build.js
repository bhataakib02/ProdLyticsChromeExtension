// build.js — Chrome extension: Vite (popup) + esbuild (background/content) + manifest for target URL
import { execSync } from "child_process";
import { copyFileSync, mkdirSync, existsSync, cpSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as esbuild from "esbuild";

const __dirname = dirname(fileURLToPath(import.meta.url));

const isDevTarget = process.env.PRODLYTICS_EXTENSION_TARGET === "development";
const dashboardOrigin = (
    process.env.PRODLYTICS_DASHBOARD_ORIGIN ||
    (isDevTarget ? "http://localhost:3000" : "https://prodlytics.vercel.app")
).replace(/\/+$/, "");
const apiBase = `${dashboardOrigin}/api`;

const define = {
    __DASHBOARD_ORIGIN__: JSON.stringify(dashboardOrigin),
    __API_BASE__: JSON.stringify(apiBase),
};

function runVite() {
    execSync("npx vite build --config vite.config.jsx", {
        stdio: "inherit",
        cwd: __dirname,
        env: {
            ...process.env,
            PRODLYTICS_DASHBOARD_ORIGIN: dashboardOrigin,
            PRODLYTICS_EXTENSION_TARGET: isDevTarget ? "development" : "production",
        },
    });
}

async function bundleExtensionScripts() {
    const common = {
        bundle: true,
        format: "esm",
        platform: "browser",
        target: "chrome120",
        define,
    };
    await esbuild.build({
        ...common,
        entryPoints: [resolve(__dirname, "src/background.jsx")],
        outfile: resolve(__dirname, "dist/background.js"),
    });
    await esbuild.build({
        ...common,
        entryPoints: [resolve(__dirname, "src/content.jsx")],
        outfile: resolve(__dirname, "dist/content.js"),
    });
}

function writeManifest() {
    const manifestPath = resolve(__dirname, "manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    const apiHost = `${dashboardOrigin}/*`;
    const hostPermissions = [apiHost];
    if (isDevTarget) {
        hostPermissions.push("http://localhost:3000/*", "http://127.0.0.1:3000/*");
    }
    hostPermissions.push("<all_urls>");
    manifest.host_permissions = hostPermissions;
    manifest.externally_connectable = {
        matches: [
            apiHost,
            ...(isDevTarget ? ["http://localhost:3000/*", "http://127.0.0.1:3000/*"] : []),
        ],
    };

    const extensionOAuthClientId =
        process.env.GOOGLE_EXTENSION_CLIENT_ID || process.env.GOOGLE_OAUTH_EXTENSION_CLIENT_ID;
    if (extensionOAuthClientId) {
        manifest.oauth2 = {
            client_id: extensionOAuthClientId,
            scopes: ["openid", "email", "profile"],
        };
    } else {
        delete manifest.oauth2;
    }

    writeFileSync(resolve(__dirname, "dist/manifest.json"), JSON.stringify(manifest, null, 4));
}

function copyStaticAssets() {
    const iconsOut = resolve(__dirname, "dist/icons");
    if (!existsSync(iconsOut)) mkdirSync(iconsOut, { recursive: true });
    cpSync(resolve(__dirname, "icons"), iconsOut, { recursive: true });

    const blockedHtml = resolve(__dirname, "blocked.html");
    const blockedCss = resolve(__dirname, "blocked.css");
    if (existsSync(blockedHtml)) copyFileSync(blockedHtml, resolve(__dirname, "dist/blocked.html"));
    if (existsSync(blockedCss)) copyFileSync(blockedCss, resolve(__dirname, "dist/blocked.css"));

    const blockedJsPath = resolve(__dirname, "blocked.js");
    if (existsSync(blockedJsPath)) {
        let blockedSrc = readFileSync(blockedJsPath, "utf8");
        blockedSrc = blockedSrc.replace(/__PRODLYTICS_DASHBOARD_ORIGIN__/g, dashboardOrigin);
        writeFileSync(resolve(__dirname, "dist/blocked.js"), blockedSrc);
    }
}

async function main() {
    console.log(`ProdLytics extension → dashboard ${dashboardOrigin} (${isDevTarget ? "development" : "production"} build)`);

    console.log("📦 Building React popup (Vite)...");
    runVite();

    console.log("⚙️  Bundling background.js & content.js (esbuild)...");
    await bundleExtensionScripts();

    console.log("📋 Writing manifest.json...");
    writeManifest();

    console.log("🎨 Copying icons & blocked page...");
    copyStaticAssets();

    console.log("✅ Extension built in dist/. Zip dist/ contents for Chrome Web Store (not the folder itself).");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
