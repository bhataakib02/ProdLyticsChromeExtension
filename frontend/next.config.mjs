/** @type {import('next').NextConfig} */
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const __projectRoot = fileURLToPath(new URL("..", import.meta.url));

const nextConfig = {
  transpilePackages: ["@backend"],
  // Next.js moved `experimental.serverComponentsExternalPackages` -> `serverExternalPackages`
  serverExternalPackages: ["mongoose"],
  experimental: {
    externalDir: true,
  },
  turbopack: {
    // Allow resolving local shared code (backend folder) inside this monorepo
    root: __projectRoot,
  },
};

export default nextConfig;
