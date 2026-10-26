import * as z from "zod";

const SignupSchema = z.object({
  username: z
    .string({ error: (iss) => (iss.input === undefined ? "Username is required" : "Username must be text") })
    .min(3),
  age: z.int({ error: (iss) => (iss.input === undefined ? "Age is required" : "Age must be a whole number") }),
});

export function validateSignup(input: unknown) {
  const result = SignupSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, fieldErrors: z.flattenError(result.error).fieldErrors };
  }
  return { ok: true, data: result.data };
}
