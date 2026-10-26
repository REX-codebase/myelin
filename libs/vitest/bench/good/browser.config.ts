import { defineConfig } from "vitest/config";
import { playwright } from "@vitest/browser-playwright";

export default defineConfig({
  test: {
    fileParallelism: false,
    api: { port: 63315 },
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({ launchOptions: { slowMo: 0 } }),
      instances: [{ browser: "chromium" }],
    },
  },
});
