import { integer, pgTable, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const memberships = pgTable("memberships", {
  userId: integer().notNull().references(() => users.id),
  orgId: integer().notNull(),
}, (t) => [
  primaryKey(t.userId, t.orgId),
]);
