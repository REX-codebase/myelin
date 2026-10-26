import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: false,
        maxForks: 4,
      },
    },
    reporters: ["basic"],
    cache: { dir: "node_modules/.vitest" },
    deps: {
      inline: [/@my-org\//],
      optimizer: {
        web: { enabled: true },
      },
    },
  },
});
