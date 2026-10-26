import { expect, it, vi } from "vitest";

const sendEmail = vi.fn<[string], Promise<boolean>>();
const retry = vi.fn<[number, string], void>();

it("sends a welcome email", async () => {
  sendEmail.mockResolvedValue(true);
  expect(await sendEmail("a@example.com")).toBe(true);
  expect(sendEmail).toHaveBeenCalledWith("a@example.com");
  retry(1, "ok");
});
