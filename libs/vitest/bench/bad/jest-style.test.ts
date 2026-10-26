import { describe, expect, it } from "vitest";
import { loadUser } from "../src/users";

jest.mock("../src/api");

describe("loadUser", () => {
  it("returns the cached user", () => {
    const fetchUser = jest.fn().mockReturnValue({ id: 1 });
    jest.spyOn(console, "warn").mockImplementation(() => {});
    expect(loadUser(fetchUser)).toEqual({ id: 1 });
  });
});
