import { afterEach, beforeEach, expect, it, vi } from "vitest";

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("stores and reads a key", () => {
  store.set("theme", "dark");
  expect(store.get("theme")).toBe("dark");
});

it("calls the callback once", async () => {
  const onDone = vi.fn();
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      onDone();
      resolve();
    }, 0);
  });
  expect(onDone).toHaveBeenCalledTimes(1);
});
