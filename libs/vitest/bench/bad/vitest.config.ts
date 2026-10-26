import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    workspace: ["packages/*"],
    environmentMatchGlobs: [
      ["**/*.dom.test.ts", "jsdom"],
      ["**/*.test.ts", "node"],
    ],
    include: ["src/**/*.test.ts"],
  },
});
