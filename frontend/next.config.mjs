import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __projectRoot = fileURLToPath(new URL("..", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@prodlytics/backend"],
  serverExternalPackages: ["mongoose", "jspdf", "jspdf-autotable"],
  experimental: {
    // Disabled experimental features to resolve SSR hang
  },
  turbopack: {
    root: __projectRoot,
    // Use browser build of jsPDF (avoid Node worker path from jspdf.node.min.js during bundling)
    resolveAlias: {
      jspdf: path.join(__dirname, "node_modules", "jspdf", "dist", "jspdf.es.min.js"),
    },
  },
};

export default nextConfig;
