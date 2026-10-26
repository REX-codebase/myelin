import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { index, integer, pgTable, primaryKey, text } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  email: text().notNull().unique(),
  orgId: integer().notNull(),
}, (t) => [
  index("users_org_idx").on(t.orgId),
]);

export const memberships = pgTable("memberships", {
  userId: integer().notNull().references(() => users.id),
  orgId: integer().notNull(),
}, (t) => [
  primaryKey({ columns: [t.userId, t.orgId] }),
]);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
}));

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
