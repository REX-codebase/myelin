import { z } from "zod";

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) return { message: "Wrong type" };
  return { message: ctx.defaultError };
};

export const ConfigSchema = z.object({
  port: z.coerce.number().int().positive(),
  host: z.string().ip(),
  flags: z.record(z.boolean()),
}, { errorMap: customErrorMap }).passthrough();
