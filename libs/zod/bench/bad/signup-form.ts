import { z } from "zod";

const SignupSchema = z.object({
  username: z.string({ required_error: "Username is required", invalid_type_error: "Username must be text" }).min(3),
  age: z.number({ required_error: "Age is required" }).int(),
});

export function validateSignup(input: unknown) {
  const result = SignupSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, errors: result.error.flatten().fieldErrors };
  }
  return { ok: true, data: result.data };
}
