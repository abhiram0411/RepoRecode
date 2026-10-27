# RepoRecode development status

## 27 October WebKit correction — local verification

WebKit originally failed 16 of 36 Linux journeys on c02a3d3. Diagnosed two real browser differences: WebKit blocks parent-installed listeners in a script-disabled frame, and implicit links/clicked dialog openers behave differently for focus. The preview now uses an opaque-origin sandbox with only a nonced trusted event bridge; project code remains in QuickJS. Strict source/origin/token and payload checks protect messages. Tests prove denied app storage/parent access, injected scripts and networking while interactive controls work under a strict production script policy.

Practice automation now targets the named editor and selects all using Monaco's user-agent platform. The skip link has an explicit tab stop; dialog openers receive focus before opening. A documented one-time resize notification remains visible and bounded by a regression requiring stable, visible graph geometry; other errors still fail. Experimental editor/graph sizing changes were removed.

All 371 unit/integration tests in 43 files passed; production build, isolated API package smoke and source scan passed. All 37 WebKit production journeys passed locally (2.6 minutes); three repeated development journeys also passed with settled geometry. All 37 Edge production journeys also passed (1.7 minutes); the real-HTTP CSP fixture passed in both engines. Fresh Linux CI follows publication. Production remains 5d58fcf and no deployment was made. Detailed local failures and diagnosis are retained; no public page-snapshot logging was added.


## 27 October continuation

Published scalar-constrained practice and Linux WebKit CI as c02a3d30d580c73844a8ae20320c307a0928dc10. GitHub run 40437947915 passed 368 unit tests, build, isolated API smoke, audit, source scan and 36 Chromium journeys, then FAILED WebKit (20 passed / 16 failed); development checks were skipped. The compatibility correction is being verified locally; see .gsd/DEBUG_WEBKIT.md. The previous publish attempt was not executed because automatic approval review hit a usage limit; after the user resumed, the normal approved publication succeeded. No bypass and no new Vercel deployment. Production remains 5d58fcf.

Refreshed docs/ENGINEERING_REPORT.md and the DOCX/PDF report on 27 October. Rendered and visually inspected all eight pages using the existing Word export script and bundled Poppler after the packaged renderer reported missing LibreOffice. Removed blank/overflow pages. Reports truthfully label the new CI run pending at preparation. These report changes are local, not included in c02a3d3. Docker Linux engine remains unavailable.


## 26 October continuation — scalar-constrained practice

Added local support for concrete generic aliases/interfaces with independent scalar bounds, including literal unions, imported bounds, defaults and concretely instantiated bases. Argument/default validation compares type domains, not probe samples. Read-only context preserves extends clauses; analysis version 10 rebuilds stored analyses. Dependent/object bounds and unresolved constrained wrappers remain unsupported. Generic functions remain unfinished.

All 368 tests / 42 files passed; the focused Edge import/practice/grading/reload journey passed. The initial restricted temporary-file failure and two superseded unsupported-type expectations are retained as separate receipts. The final production build passed, with existing bundle-size and upstream annotation warnings. The initial WebKit dependency validation reported jpeg62.dll missing; a 27 October run with normal installed-browser access launched successfully and reproduced the CI interaction bug; Linux CI now includes the complete WebKit suite. This code is prepared for the next GitHub batch, not deployed.


Updated 27 October 2026. Continue this project in this chat. This is a recovery record, not an AI handoff. The full master specification remains incomplete.

## Current live state

- Public app: https://repo-recode.vercel.app/
- Deployed source: 5d58fcf0af3cdcfcfc39beaa3f38f529895931d1.
- Vercel deployment BBRq3X7B8qBgV2XWMVSAiLTkvCJV is Ready on the existing personal Hobby project repo-recode (team itzzabhi12308-7083s-projects). Node 24, Vite, npm ci --ignore-scripts, dist. Automatic Git deployments remain disabled.
- Supabase Free project oppotpgwkhyzgidjuonc, Tokyo/NANO, organization guaigpyjtkwcatnzpjbp. Migrations 001–007 are APPLIED. Do not rerun them. SQL editor application does not populate CLI migration history.
- Migration 007 adds four RLS tables denying direct browser/server-role access and four server-only functions. Catalog checks passed; backend version is 7. Production has ten RLS tables and thirteen privileged functions across all migrations.
- Production-only server settings are saved: APP_ORIGIN, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY, HOSTED_BACKEND_ENABLED=true. The existing server key was copied directly between dashboards with explicit owner approval; its value was not saved in source, chat or logs. Frontend VITE_ settings contain public values only.
- GitHub sign-in is enabled with exact production Site/return URLs. Google and manual linking remain disabled. The separate private-repository GitHub App is not configured.
- All nine live HTTP checks pass: health and community capabilities, JSON unknown/local-admin denial, unauthenticated account/admin denial, origin rejection and invalid feedback/activity rejection. Health reports Auth/account-deletion configured and AI disabled; feedback/activity availability is true. This does not prove real account deletion.
- Owner-approved synthetic live writes passed: feedback accepted, unchanged retry reused one record, changed retry rejected; activity stored, revoked, and delayed retry rejected. SQL confirmed one feedback row and a revocation marker with cleared days. Cleanup of only those two test records is complete: SQL returned feedback_remaining=0 and activity_remaining=0; screenshot hosted-test-cleanup-verified.png records the result. The app draft was cleared and the owner's browser consent remains off.
- Source download verified: 247 files, 3,768,376 bytes, SHA-256 a144f0f3092ef3ded9ffbc60613118091ffd62f7fd7b422659448dacc156c9a4. Includes API, migration 007, both deployment fixes and Zod 4.6.6; no private .env files. HTTP/security headers passed.

## Verification and deployment history

GitHub run 40322121312 for 5d58fcf passed all 353 tests / 42 files, production build, isolated native package smoke with rewrite query metadata, audit (zero vulnerabilities), source scan (205 files, zero findings), 36 Chromium journeys and 5 development journeys. The preceding backend batch passed 353 local tests and all 36 Edge journeys, including local feedback. Six targeted live guest journeys passed on 261eca4; frontend application code is unchanged in the two subsequent backend corrections.

Two real deployment issues were found and fixed before acceptance: 261eca4 omitted src/core/import.ts from the Vercel function package (500); 17e0431 fixed packaging but health/status matched the whole rewritten URL (404). 5d58fcf matches the route path consistently. Preserve the failure receipts; Ready alone was not proof of working APIs. No further deployment is needed for this batch.

Earlier live acceptance on 24 October: GitHub login/logout/relogin, approved Trail journal cloud upload/restore/delete, preference restoration, sample analysis/practice and React preview. The test cloud project was removed; local sample/progress and default account preferences remain. No private source was uploaded.

Primary receipts in artifacts/: github-ci-5d58fcf.json, hosted-live-http-results.json, hosted-live-source-results.json, hosted-live-write-results.json, supabase-backend-setup.json, vercel-hosted-setup.json. Historical failures: hosted-live-http-startup-failure.json, hosted-live-routing-failure.json, hosted-backend-route-failure.json and hosted-backend-worker-failure.json. Earlier chronology is retained in .gsd/RESUME_HISTORY_20261026.md and JOURNAL.md.

## Owner decisions

Strict ₹0: no paid services, cards, upgrades, paid trials, overages or paid AI. MIT and public GitHub approved. Batch releases; do not redeploy for each small edit. Coding Pet is silent and reactions-only; no AI tutor/chat/voice. Core learning works locally without an account. User revoked the old 5% reserve and asked to continue here, without handing over. Do not repeat completed account provisioning or approved permissions.

The owner explicitly deferred the real two-account isolation test because a second account is unavailable. Account deletion must never be tested on the owner's real account. Credential creation/rotation and authenticator enrollment require owner participation; never ask for secrets in chat.

## Remaining work

1. Hosted acceptance, test cleanup and local setup/feature/resume notes are complete. New receipts necessarily postdate the immutable deployed source archive and have not been published as another release. Keep existing production as-is while implementing the next batch.
2. Real two-account isolation (deferred), email recovery/delivery, TOTP, identity linking, global-session behavior and disposable-account deletion acceptance. Individual-device session inventory is unfinished. Google and the private-repository GitHub App remain unconfigured. Vercel repository access and sign-in OAuth are separate from that App.
3. Independent PostgreSQL connections to verify concurrent admission/locking and GitHub refresh leases. PGlite is single-connection; Docker CLI exists but Docker's Linux engine was unavailable. Live administrator dashboard requires authorized admin role/MFA and is not yet verified.
4. Learning backlog in MASTER_SPEC.md / FEATURES.md: generic functions, constrained/deeper input types, persistent indexes/source watching, broader indirect state/API/data relationships, more isolated preview dependencies/frameworks. Preserve honest unsupported labels and finite practice bounds.
5. Manual accessibility, WebKit/low-end performance, Docker execution, independent security assessment and operator contacts. Optional local Ollama is unimplemented; no paid provider is authorized. Reports were refreshed and visually verified on 27 October; their CI snapshot is labelled pending at preparation.

## Working directories and checks

Root C:/Users/ABHIRAM/Desktop/Repo Recode is the dirty Sites history. Never push root history to GitHub or reset its work. tmp/github-v10 is the separate public main checkout, currently on c02a3d3, with no configured remote. Use the explicit https://github.com/abhiram0411/RepoRecode.git URL and verify remote main before pushing. Only copy reviewed public files. Its untracked .gsd folder is a copied local recovery directory, not part of the public commit.

Use Node 24. npm test -- --maxWorkers=1 is reliable on this Windows host; an earlier two-worker crash is retained. CI uses two Linux workers. npm run build; node scripts/check-hosted-entry.mjs checks the isolated API package; node scripts/scan-source.mjs is heuristic only. Local browser suites use LOCAL_COMMUNITY_E2E=true and unset TEST_URL. Public suites must unset that local fixture flag and use separate receipts. Never rerun local feedback fixtures against production.

Hosted files: api/index.mjs, server/hosted.mjs, server/communityDatabase.mjs, server/requestBody.mjs, server/communitySchemas.mjs, migration 007 and vercel.json. Function config explicitly includes src/core/import.ts. Hosted stores cap feedback at 1,000 rows and combined activity/revocation at 10,000; shared service quotas are fixed. Cleanup is opportunistic (feedback 90 days, activity/revocation 30 days), not scheduled. Hosted local-admin/file store/background alert timers stay disabled.

Old Sites version 17 remains unchanged at https://reporecode-learning-lab.milkyibex8.chatgpt.site/. This task now uses the Vercel app above. No Sites deployment is needed.
