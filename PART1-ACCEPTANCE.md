# Part 1 Acceptance Criteria

- [x] SDK is built and published to workspace (@vizzly-sa/sdk).
- [x] Pilot customer (Starter Template) integrated and rendering.
- [x] RLS verified (cross-tenant leak test passes in `apps/api/src/lib/rls.test.ts`).
- [x] NL query input works for 5 representative questions.
- [x] Time-to-first-dashboard measured under 2 hours.
- [x] Semantic layer auto-generator produced an editable layer in under 15 minutes.
- [ ] Control plane has run for 7 consecutive days (Pending Railway deploy).
- [x] Cross-tenant leak test exists in the repo and passes.

## Known Gaps
- Edge caching (Step 13) was skipped for local dev.
- CSV export deferred to later on.