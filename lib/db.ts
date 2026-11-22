import "server-only";
import postgres from "postgres";

/** Lazy Postgres (Supabase) client, or null when DATABASE_URL isn't configured (features degrade gracefully). */
let sql: ReturnType<typeof postgres> | null | undefined;

export function db() {
  if (sql === undefined) {
    const url = process.env.DATABASE_URL;
    // Supabase's transaction pooler (port 6543, the one to use from Vercel) doesn't support prepared statements.
    const pooled = !!url && /:6543\b|pooler\.supabase/.test(url);
    sql = url ? postgres(url, { ssl: "require", max: 3, idle_timeout: 20, prepare: !pooled }) : null;
  }
  return sql;
}
