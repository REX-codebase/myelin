import { eq, placeholder } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

export const userByEmail = db
  .select()
  .from(users)
  .where(eq(users.email, placeholder("email")))
  .prepare("user_by_email");
