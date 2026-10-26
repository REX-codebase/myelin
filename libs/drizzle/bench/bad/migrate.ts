import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const db = drizzle({ client: new Pool({ connectionString: process.env.DATABASE_URL }) });

await migrate(db, { migrationsFolder: "./drizzle" });
