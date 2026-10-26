import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "packages/*",
  {
    test: {
      name: "e2e",
      include: ["e2e/**/*.spec.ts"],
    },
  },
]);
