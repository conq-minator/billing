import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { closeDb, getDb } from "./client";

export async function runMigrations(
  dbArg?: PgliteDatabase<typeof schema> | NodePgDatabase<typeof schema>
): Promise<void> {
  const db = dbArg ?? getDb();
  const isPg = Boolean(process.env.DATABASE_URL?.trim());
  if (isPg && !dbArg) {
    await migratePg(db as NodePgDatabase<typeof schema>, {
      migrationsFolder: "./drizzle",
    });
  } else {
    await migratePglite(db as PgliteDatabase<typeof schema>, {
      migrationsFolder: "./drizzle",
    });
  }
}

if (require.main === module) {
  runMigrations()
    .then(async () => {
      console.log("Migrations applied successfully.");
      await closeDb();
    })
    .catch(async (err) => {
      console.error("Migration failed:", err);
      await closeDb();
      process.exit(1);
    });
}
