# DB scripts

| Command | Reads | Effect | Idempotent |
|---|---|---|---|
| `npm run db:schema` | `DATABASE_URL`, `db/schema.sql` | Creates extensions, enums, tables, hypertable, continuous aggregate + policy | Yes (`IF NOT EXISTS`) |
| `npm run db:seed` | `DATABASE_URL`, `db/seed.sql` | Inserts 6 landmark + starter missions and 6 badges | Yes (`ON CONFLICT DO NOTHING`) |

Exit code non-zero with a clear message when `DATABASE_URL` is missing.
