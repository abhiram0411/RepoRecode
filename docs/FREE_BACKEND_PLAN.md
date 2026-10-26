# Remaining hosted backend

Updated 26 October 2026. The local implementation now includes the shared Node handler, Vercel entry/routing, database community store, bounded RPCs and default-off configuration. Commit 261eca4 passed GitHub CI and migration 007 was applied with owner approval on 26 October. The approved deployment reached Ready, but API startup failed because the function package omitted src/core/import.ts. An explicit includeFiles correction and isolated-package smoke test are prepared. Live backend acceptance remains pending; six live guest journeys passed. Keep the existing Vercel Hobby project and Supabase Free project. No new subscription, payment method, marketplace database, paid AI, paid SMTP or paid monitoring is authorized.

Local verification: 353 tests / 42 files and native Node entry smoke passed. All 36 Edge browser journeys (including local feedback) and the final production build passed. The fresh dependency audit has zero findings; the source scan checked 207 files with no findings. The old file store remains available only for local use. The production backend requires the explicit server settings and migration described in VERCEL_SUPABASE_SETUP.md.

The implementation caps feedback at 1,000 rows; activity and revocation markers share 10,000 rows. Feedback older than 90 days and inactive/revoked activity older than 30 days are cleaned on the next write or administrator snapshot. Expiry is not a promise of scheduled physical erasure. Feedback retries use the same random identifier while the unchanged form remains mounted; a changed form gets a new identifier. The database rejects reusing an identifier for different content and retains accepted identifiers with their feedback.

Global accepted-request limits are shared across all replicas and users: feedback 100/hour and 1,000/day; activity 500/hour and 5,000/day; account administration 20/hour and 100/day; admin reads 60/hour and 300/day; GitHub 120/hour and 600/day. Activity revocation bypasses collection admission so a full collection budget does not prevent deletion. Five fixed counter rows cannot grow with arbitrary user identifiers. These bounds limit accepted work/storage; they do not stop all abusive traffic or prevent provider quota exhaustion. No IP addresses or extra device fingerprints are stored for rate limiting.

## Hosting decision

Use a shared same-origin Vercel Node function for the supported API routes and the existing Supabase database for durable state. Keep shared code outside the root `api/` directory. Vercel documents shared routing through one function and API-specific rewrites; retain real 404s for unknown endpoints and never rewrite APIs to the HTML shell. [Vercel Node runtime](https://vercel.com/docs/functions/runtimes/node-js)

Hobby is for personal, non-commercial use; exceeding included limits can pause features. Supabase states Free organizations are not charged. This design accepts service unavailability at quota exhaustion; it does not promise unlimited free availability. Keep both plans free and decline upgrades. Recheck the actual account plans before enabling the backend. [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase cost control](https://supabase.com/docs/guides/platform/cost-control)

## Implemented structure and remaining integration

1. Extract a request handler from the local gateway without changing local behavior. The hosted adapter must never initialize the local file store. Disabled services return structured unavailable responses. Health advertises capabilities independently; no secret or account details appear there.
2. Migration 007 adds bounded feedback, activity and shared request limits. Do not rerun migrations 001–006 on production. Server-only functions have explicit grants/search paths. Browser roles and the service role cannot read or mutate these four tables directly; the service role uses the bounded functions. Requests enforce input sizes and transactional admission. Retention is defined above.
3. Store quotas and idempotency records in PostgreSQL, shared across function instances. Require atomic checks before writes; fail closed on database errors. Cap retained quota keys and all lists. Opportunistic bounded cleanup avoids requiring a paid scheduler. Origin validation alone is not an anti-abuse mechanism; public endpoints also need shared quotas and input limits.
4. Adapt feedback/activity/admin routes to the durable store. Store only the existing explicitly submitted fields. Activity remains opt-in and removable. Protect admin with server-verified role and MFA. Do not label one function instance's counters as global infrastructure metrics.
5. Host account deletion with verified Supabase authentication, exact origin/method/body checks and an explicit confirmation. Always derive the target from the verified user. Keep secrets in server-only configuration. Test database cascades and stale sessions; cancellation/timeouts must never be presented as proof of deletion.
6. Integrate the existing GitHub App store and shared refresh leases after the owner completes its separate configuration. Preserve selected-repository read permissions, encrypted credentials and disconnect-safe writes. Sign-in OAuth does not authorize private repository imports.

## Acceptance and release

- Local integration: absent configuration, forbidden origins, malformed/oversized payloads, anonymous table denial, quota exhaustion, rollback, retention/deletion, administrator denial, separate handler instances, restart persistence and duplicate retries.
- Real PostgreSQL: use independent connections to prove concurrent admission/refresh behavior. PGlite's single connection is insufficient for that claim.
- Live: owner-assisted server-secret configuration, one reviewed migration, one batched deployment, then approved disposable sample checks and cleanup. No real account deletion without explicit consent to that destructive test. Two-account isolation remains deferred by the owner.
- Record exact source, migration, deployment, plan and acceptance evidence. Unconfigured capabilities stay unavailable. Keep the frontend usable when quotas are exhausted.
