import "@CRM-APP/env/web";
import type { NextConfig } from "next";

// En-têtes de sécurité statiques appliqués à toutes les routes. La
// Content-Security-Policy est gérée par le middleware (nonce par requête,
// cf. src/middleware.ts) — elle ne peut pas être statique ici.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.95"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
