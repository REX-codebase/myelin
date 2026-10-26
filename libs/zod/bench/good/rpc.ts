import * as z from "zod";

const User = z.object({ id: z.string(), name: z.string() });

export const fetchUser = z
  .function({ input: [z.string()], output: User })
  .implementAsync(async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return User.parse(await res.json());
  });

export const Status = z.enum(["active", "disabled"]);
export const ACTIVE = Status.enum.active;
