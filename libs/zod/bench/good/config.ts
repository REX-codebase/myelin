import * as z from "zod";

z.config({
  customError: (iss) => (iss.code === "invalid_type" ? "Wrong type" : undefined),
});

export const ConfigSchema = z.looseObject({
  port: z.coerce.number().int().positive(),
  host: z.union([z.ipv4(), z.ipv6()]),
  flags: z.record(z.string(), z.boolean()),
});
