/**
 * Creates prodlytics-extension-store.zip from dist/ contents (files at zip root — Chrome Web Store format).
 * Run: npm run build && npm run zip:store
 */
import archiver from "archiver";
import { createWriteStream, existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, "dist");
const outFile = resolve(__dirname, "prodlytics-extension-store.zip");

if (!existsSync(distDir)) {
    console.error("Missing extension/dist. Run: npm run build");
    process.exit(1);
}

const output = createWriteStream(outFile);
const archive = archiver("zip", { zlib: { level: 9 } });

archive.on("error", (err) => {
    throw err;
});

output.on("close", () => {
    console.log(`Wrote ${outFile} (${archive.pointer()} bytes)`);
});

archive.pipe(output);
archive.directory(distDir + "/", false);
await archive.finalize();
