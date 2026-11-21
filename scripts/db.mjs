// Run a SQL file against DATABASE_URL:  node scripts/db.mjs db/schema.sql
import { readFileSync, existsSync } from "node:fs";
import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/db.mjs <file.sql>");
  process.exit(1);
}

// Load .env.local / .env if present (Node 22+ built-in).
for (const f of [".env.local", ".env"]) if (existsSync(f)) process.loadEnvFile(f);

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Add your Tiger Data connection string to .env.local.");
  process.exit(1);
}

const sql = postgres(url, { ssl: "require", max: 1, onnotice: () => {} });
try {
  await sql.unsafe(readFileSync(file, "utf8"));
  console.log(`✓ ran ${file}`);
} catch (err) {
  console.error(`✗ ${file}: ${err.message}`);
  process.exitCode = 1;
} finally {
  await sql.end();
}
