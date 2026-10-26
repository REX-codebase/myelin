import { drizzle } from "drizzle-orm/pg-core";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool);
