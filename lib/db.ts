import "server-only";
import postgres from "postgres";

/** Lazy Tiger Data client, or null when DATABASE_URL isn't configured (features degrade gracefully). */
let sql: ReturnType<typeof postgres> | null | undefined;

export function db() {
  if (sql === undefined) {
    sql = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL, { ssl: "require", max: 3, idle_timeout: 20 }) : null;
  }
  return sql;
}
