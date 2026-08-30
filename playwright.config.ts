import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30000,
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", viewport: { width: 1400, height: 900 } },
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "npm run start", port: 3000, reuseExistingServer: true, timeout: 60000 },
});
