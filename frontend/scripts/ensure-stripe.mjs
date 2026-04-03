/**
 * Ensures `stripe` exists under frontend/node_modules before Next compiles.
 * Run via npm "dev" / "build" scripts so `next dev` always resolves the package.
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(path.join(root, "package.json"));

function stripeOk() {
    try {
        require.resolve("stripe");
        return true;
    } catch {
        return false;
    }
}

if (stripeOk()) {
    process.exit(0);
}

// Keep this scoped to `stripe` only to avoid re-running the full install tree from postinstall hooks.
const result = spawnSync(
    "npm",
    ["install", "stripe@^18.1.1", "--no-fund", "--no-audit"],
    { cwd: root, stdio: "inherit", shell: true }
);

if (result.status !== 0) {
    console.error('[prodlytics] Could not install "stripe". From the frontend folder run: npm install');
    process.exit(result.status ?? 1);
}

if (!stripeOk()) {
    console.error('[prodlytics] "stripe" is still missing after npm install.');
    process.exit(1);
}
