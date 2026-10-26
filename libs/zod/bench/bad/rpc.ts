import { z } from "zod";

export const fetchUser = z
  .function()
  .args(z.string())
  .returns(z.promise(z.object({ id: z.string(), name: z.string() })));

export const Status = z.enum(["active", "disabled"]);
export const ACTIVE = Status.Enum.active;
