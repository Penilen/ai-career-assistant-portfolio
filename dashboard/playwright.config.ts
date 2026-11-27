import { defineConfig } from "@playwright/test";

const baseURL = "http://127.0.0.1:8443";

export default defineConfig({
  testDir: "./tests",
  use: { baseURL },
  // Make sure both local servers are ready before the browser tests begin.
  webServer: [
    {
      // Use fictional records for browser tests without contacting Google.
      command: "node tests/fixtures/startApplicationsApi.ts",
      url: "http://127.0.0.1:3001/api/applications",
      // Require the test server so the suite cannot reuse a live Sheets backend.
      reuseExistingServer: false,
    },
    {
      command: "node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 8443",
      url: baseURL,
      reuseExistingServer: !process.env.CI,
    },
  ],
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
