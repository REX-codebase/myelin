import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    maxWorkers: 4,
    isolate: true,
    fileParallelism: false,
    reporters: ["default", "junit"],
    outputFile: { junit: "reports/junit.xml" },
    server: {
      deps: {
        inline: [/@my-org\//],
      },
    },
    deps: {
      optimizer: {
        client: { enabled: true },
      },
    },
  },
});
