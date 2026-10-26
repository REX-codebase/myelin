import * as z from "zod";

export const UserSchema = z.strictObject({
  id: z.uuid(),
  email: z.email({ error: "Enter a valid email" }),
  website: z.url().optional(),
  createdAt: z.iso.datetime(),
});

export type User = z.infer<typeof UserSchema>;
