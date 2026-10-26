import { z } from "zod";

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().trim().email({ message: "Enter a valid email" }),
  website: z.string().url().optional(),
  createdAt: z.string().datetime(),
}).strict();

export type User = z.infer<typeof UserSchema>;
