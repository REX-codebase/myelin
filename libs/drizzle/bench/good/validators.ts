import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { users } from "./schema";

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
