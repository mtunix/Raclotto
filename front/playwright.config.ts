import { mkdtempSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

// One throwaway database and admin per run; workers inherit these from the main process.
process.env.E2E_RUN_DIR ??= mkdtempSync(path.join(tmpdir(), "raclotto-e2e-"));
process.env.E2E_ADMIN_PASSWORD ??= randomBytes(18).toString("base64url");
const runDir = process.env.E2E_RUN_DIR;
const port = Number(process.env.E2E_PORT ?? 8091);

export default defineConfig({
  testDir: "e2e",
  outputDir: path.join(runDir, "results"),
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // E2E_CHANNEL=chrome runs the installed Google Chrome instead of Playwright's own Chromium.
    channel: process.env.E2E_CHANNEL,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: path.join(runDir, "admin.json") },
      dependencies: ["setup"],
    },
  ],
  // The production server and build, as they ship; never a running dev server and its database.
  webServer: {
    command: "npm run build:static && cd .. && venv/bin/python -m back.src.main",
    url: `http://127.0.0.1:${port}/api/health`,
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      RACLOTTO_HOST: "127.0.0.1",
      RACLOTTO_PORT: String(port),
      RACLOTTO_DATABASE_URL: `sqlite:///${path.join(runDir, "raclotto.db")}`,
      RACLOTTO_LOG_FILE: path.join(runDir, "raclotto-api.log"),
      RACLOTTO_JWT_SECRET: randomBytes(32).toString("hex"),
      RACLOTTO_ADMIN_PASSWORD: process.env.E2E_ADMIN_PASSWORD,
      RACLOTTO_TRUSTED_PROXY: "",
      // Set, so `.env` can't supply one: level-ups must not call the real image model.
      GOOGLE_GENAI_API_KEY: "",
    },
  },
});
