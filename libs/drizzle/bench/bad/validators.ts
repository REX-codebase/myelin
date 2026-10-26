import { createInsertSchema } from "drizzle-orm/zod";
import { users } from "./schema";

export const insertUserSchema = createInsertSchema(users);
