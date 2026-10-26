import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

export const userByEmail = db
  .select()
  .from(users)
  .where(eq(users.email, sql.placeholder("email")))
  .prepare("user_by_email");

export async function saveUser(email: string, orgId: number) {
  await db
    .insert(users)
    .values({ email, orgId })
    .onConflictDoUpdate({
      target: users.email,
      set: { orgId },
      targetWhere: sql`${users.email} is not null`,
      setWhere: eq(users.orgId, 1),
    });
}

export async function listMembers(orgId: number) {
  return db.query.users.findMany({
    where: eq(users.orgId, orgId),
    with: { memberships: true },
  });
}
