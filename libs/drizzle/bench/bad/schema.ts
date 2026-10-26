import { index, integer, pgTable, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  email: text().notNull(),
  orgId: integer().notNull(),
}, (t) => ({
  emailIdx: index("users_email_idx").on(t.email),
  orgIdx: index("users_org_idx").on(t.orgId),
}));
