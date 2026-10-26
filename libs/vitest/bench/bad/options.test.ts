import { describe, expect, it, test } from "vitest";

test.scoped({ db: async ({}, use) => { await use({ id: 1 }); } });

describe("sync", () => {
  it("syncs a large batch", async () => {
    const rows = await Promise.resolve([1, 2, 3]);
    expect(rows).toHaveLength(3);
  }, { timeout: 30000 });
});
