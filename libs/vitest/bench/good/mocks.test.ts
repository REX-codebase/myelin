import { expect, it, vi } from "vitest";

const sendEmail = vi.fn<(to: string) => Promise<boolean>>(async () => true);

const clock = { now: () => 0 };

it("sends one welcome email", async () => {
  expect(await sendEmail("a@example.com")).toBe(true);
  expect(sendEmail).toHaveBeenCalledWith("a@example.com");
});

it("spies on the clock", () => {
  const spy = vi.spyOn(clock, "now").mockReturnValue(1_700_000_000_000);
  expect(clock.now()).toBe(1_700_000_000_000);
  expect(spy).toHaveBeenCalledTimes(1);
  spy.mockRestore();
});
