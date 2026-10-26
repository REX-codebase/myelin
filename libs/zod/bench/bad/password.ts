import { z } from "zod";

export const PasswordForm = z
  .object({
    password: z.string().min(8, { message: "At least 8 characters" }),
    confirm: z.string(),
  })
  .superRefine((val, ctx) => {
    if (val.password !== val.confirm) {
      ctx.addIssue({ code: "custom", message: `Mismatch at ${ctx.path.join(".")}`, path: ["confirm"] });
    }
  });
