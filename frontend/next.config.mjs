import { fileURLToPath } from "url";
const __projectRoot = fileURLToPath(new URL("..", import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@aero/backend"],
  serverExternalPackages: ["mongoose"],
  experimental: {
    // Disabled experimental features to resolve SSR hang
  },
  turbopack: {
    root: __projectRoot,
  },
};

export default nextConfig;
