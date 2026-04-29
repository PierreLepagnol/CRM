import "@CRM-APP/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  allowedDevOrigins: ["192.168.1.95"],
};

export default nextConfig;
