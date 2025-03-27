// Global window declaration to pass timing results and SpeedTest instance
declare global {
  interface Window {
    SpeedTestResults?: object;
    SpeedTestError?: object;
    CloudflareSpeedTest?: unknown;
  }
}

export {};

////////////////////////////////////////////////////////////

// Import cloudflare's default export for vite to build the umd
import SpeedTest from "@cloudflare/speedtest";

window.CloudflareSpeedTest = SpeedTest;
