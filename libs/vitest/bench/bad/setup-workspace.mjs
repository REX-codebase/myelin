import { writeFileSync } from "node:fs";

const projects = ["packages/api", "packages/web"];

writeFileSync(
  "vitest.workspace.ts",
  `export default ${JSON.stringify(projects)};\n`,
);
console.log("wrote vitest.workspace.ts for", projects.length, "projects");
