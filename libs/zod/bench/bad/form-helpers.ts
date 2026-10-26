import { z } from "zod";

export function schemaKind(schema: z.ZodTypeAny): string {
  return schema._def.typeName;
}

export const Contact = z.object({
  email: z.string().email(),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/),
});
