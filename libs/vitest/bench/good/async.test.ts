import { describe, expect, it } from "vitest";

async function fetchUser(id: number) {
  if (id < 0) throw new Error("not found");
  return { id, name: "Ada" };
}

async function waitForTheme() {
  return "dark";
}

describe("fetchUser", () => {
  it("resolves the user", async () => {
    await expect(fetchUser(1)).resolves.toEqual({ id: 1, name: "Ada" });
  });

  it("rejects unknown ids", async () => {
    await expect(fetchUser(-1)).rejects.toThrow("not found");
  });

  it("polls until the theme is dark", async () => {
    await expect.poll(() => waitForTheme()).toBe("dark");
  });

  it("finishes a slow job", { timeout: 10_000 }, async () => {
    const result = await Promise.resolve(42);
    expect(result).toBe(42);
  });
});
