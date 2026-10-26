import { sql } from "drizzle-orm";
import { db } from "./db";
import { users } from "./schema";

export async function saveUser(email: string, orgId: number) {
  await db
    .insert(users)
    .values({ email, orgId })
    .onConflictDoUpdate({
      target: users.email,
      set: { orgId },
      where: sql`${users.orgId} <> excluded.org_id`,
    });
}
