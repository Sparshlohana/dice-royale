import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR / dev-resource access when the app is opened from another device
  // on the LAN (e.g. http://192.168.0.114:3000). Without this, cross-origin
  // dev requests are blocked and CSS/JS hot updates never reach the browser.
  allowedDevOrigins: ["192.168.0.114"],
};

export default nextConfig;
