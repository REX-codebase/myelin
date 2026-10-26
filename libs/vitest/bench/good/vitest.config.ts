import { defineConfig, defineProject } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          environment: "node",
        },
      }),
      defineProject({
        test: {
          name: "dom",
          include: ["src/**/*.dom.test.ts"],
          environment: "jsdom",
        },
      }),
    ],
  },
});
