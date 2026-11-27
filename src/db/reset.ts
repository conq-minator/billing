import { closeDb, getDb } from "./client";
import { resetDatabase, type DemoProfile } from "./seed";

const profileArg = (process.argv[2] as DemoProfile) || "fresh";
const db = getDb();

resetDatabase(db, profileArg)
  .then(async () => {
    console.log(`Demo reset complete (profile: ${profileArg}).`);
    await closeDb();
  })
  .catch(async (err) => {
    console.error("Demo reset failed:", err);
    await closeDb();
    process.exit(1);
  });
