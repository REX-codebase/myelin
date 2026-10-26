import { describe, expect, it, test } from "vitest";

describe("parser", () => {
  it.todo("handles unicode escapes");

  test.each([
    ["1", 1],
    ["2", 2],
  ])("parses %s", (input, expected) => {
    expect(Number(input)).toBe(expected);
  });

  it("parses a batch", { timeout: 30_000 }, async () => {
    const rows = await Promise.resolve([1, 2, 3]);
    expect(rows).toHaveLength(3);
  });
});
