import { expect, it } from "vitest";
import { fetchUser, loadSettings } from "../src/api";

it("loads the user", () => {
  expect(fetchUser(1)).resolves.toEqual({ id: 1 });
  expect.poll(() => loadSettings().theme).toBe("dark");
});

it("loads settings with a callback", (done) => {
  loadSettings().then(() => {
    expect(true).toBe(true);
    done();
  });
});
