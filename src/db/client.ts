import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePg, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type AppDb =
  | PgliteDatabase<typeof schema>
  | NodePgDatabase<typeof schema>;

let dbInstance: AppDb | null = null;
let pgliteInstance: PGlite | null = null;
let pgPool: Pool | null = null;

export function getDb(): AppDb {
  if (dbInstance) return dbInstance;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    pgPool = new Pool({ connectionString: databaseUrl });
    dbInstance = drizzlePg(pgPool, { schema });
    return dbInstance;
  }

  const dataDir = process.env.PGLITE_DIR || "./.pglite";
  pgliteInstance = new PGlite(dataDir);
  dbInstance = drizzlePglite(pgliteInstance, { schema });
  return dbInstance;
}

export async function createMemoryDb(): Promise<{
  db: PgliteDatabase<typeof schema>;
  client: PGlite;
}> {
  const client = new PGlite();
  const db = drizzlePglite(client, { schema });
  return { db, client };
}

export async function closeDb(): Promise<void> {
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
  if (pgliteInstance) {
    await pgliteInstance.close();
    pgliteInstance = null;
  }
  dbInstance = null;
}
