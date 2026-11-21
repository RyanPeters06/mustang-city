# Tasks: Geo-pinned Tags

- [x] T001 `db/schema.sql` — `tag_votes` table + index
- [x] T002 `lib/tagRules.ts` — shared limits, `Tag` type, privacy check
- [x] T003 `app/api/tags` — GET (revealed-cell gate), POST (screening, limits), DELETE own
- [x] T004 `app/api/tags/[id]/vote` — POST/DELETE, +10 Rep to author; `/api/me` counts tag votes
- [x] T005 `lib/tags.ts` — client store, server/local modes, sample tags
- [x] T006 Map `tag-pins` layer + tap; `TagButton`, `TagComposer`, `TagDetail`; Profile `TagsSection`
- [x] T007 Verify tsc, lint, build; browser local-mode walkthrough
- [ ] T008 Two-account server check (needs DATABASE_URL + Auth0)
