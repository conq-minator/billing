import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite, PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle as drizzlePg, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type AppDb =
  | PgliteDatabase<typeof schema>
  | NodePgDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __boliDb?: AppDb;
  __boliPglite?: PGlite;
  __boliPgPool?: Pool;
};

export function getDb(): AppDb {
  if (globalForDb.__boliDb) return globalForDb.__boliDb;

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    globalForDb.__boliPgPool = new Pool({ connectionString: databaseUrl });
    globalForDb.__boliDb = drizzlePg(globalForDb.__boliPgPool, { schema });
    return globalForDb.__boliDb;
  }

  const dataDir = process.env.PGLITE_DIR || "./.pglite";
  globalForDb.__boliPglite = new PGlite(dataDir);
  globalForDb.__boliDb = drizzlePglite(globalForDb.__boliPglite, { schema });
  return globalForDb.__boliDb;
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
  if (globalForDb.__boliPgPool) {
    await globalForDb.__boliPgPool.end();
    globalForDb.__boliPgPool = undefined;
  }
  if (globalForDb.__boliPglite) {
    await globalForDb.__boliPglite.close();
    globalForDb.__boliPglite = undefined;
  }
  globalForDb.__boliDb = undefined;
}
