import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const monorepoRoot = path.resolve(__dirname, "..");
const jspdfBrowser = path.join(__dirname, "node_modules", "jspdf", "dist", "jspdf.es.min.js");
const nm = (...segments) => path.join(__dirname, "node_modules", ...segments);

/** Prefer local install; fall back to hoisted monorepo `node_modules` (e.g. after `npm install` at repo root). */
function resolveStripeDir() {
    const candidates = [nm("stripe"), path.join(monorepoRoot, "node_modules", "stripe")];
    for (const p of candidates) {
        try {
            if (fs.existsSync(path.join(p, "package.json"))) return p;
        } catch {
            /* ignore */
        }
    }
    return nm("stripe");
}
const stripeDir = resolveStripeDir();

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@prodlytics/backend"],
  serverExternalPackages: ["mongoose", "jspdf", "jspdf-autotable", "jszip", "stripe"],
  experimental: {
    // Disabled experimental features to resolve SSR hang
  },
  turbopack: {
    root: monorepoRoot,
    resolveAlias: {
      jspdf: jspdfBrowser,
      "@backend": path.join(monorepoRoot, "backend"),
    },
  },
  webpack: (config) => {
    const backendRoot = path.join(monorepoRoot, "backend");
    config.resolve.alias = {
      ...config.resolve.alias,
      jspdf: jspdfBrowser,
      // Stable resolution on Vercel (avoids fragile ../../../../ chains in API routes).
      "@backend": backendRoot,
      mongoose: nm("mongoose"),
      bcryptjs: nm("bcryptjs"),
      stripe: stripeDir,
    };
    return config;
  },
  /** If App Router /privacy-policy is missing from a deploy, fall back to public/privacy-policy.html */
  async rewrites() {
    return {
      afterFiles: [
        { source: "/privacy-policy", destination: "/privacy-policy.html" },
      ],
    };
  },
};

export default nextConfig;
