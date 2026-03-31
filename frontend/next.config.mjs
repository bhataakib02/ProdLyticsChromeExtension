import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, "..");
const jspdfBrowser = path.join(__dirname, "node_modules", "jspdf", "dist", "jspdf.es.min.js");
const nm = (...segments) => path.join(__dirname, "node_modules", ...segments);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@prodlytics/backend"],
  serverExternalPackages: ["mongoose", "jspdf", "jspdf-autotable"],
  experimental: {
    // Disabled experimental features to resolve SSR hang
  },
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      jspdf: jspdfBrowser,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      jspdf: jspdfBrowser,
      // Backend package lives in ../backend; hoisted deps are only under frontend/node_modules.
      mongoose: nm("mongoose"),
      bcryptjs: nm("bcryptjs"),
    };
    return config;
  },
};

export default nextConfig;
