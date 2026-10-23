# RepoRecode development status

Updated 23 October 2026. Continue the existing project; preserve uncommitted work. The full master specification remains unfinished. The user explicitly asked to keep working in this chat and not hand over to another AI; maintain this file only as a recovery record.

## Active work

Deployment preparation follow-up: static Vercel configuration has automatic Git deployments disabled, modern Supabase publishable-key support, and build-time public configuration validation. Production build, all 327 tests in 39 files and five Edge startup/practice/preview journeys passed. Separate receipts: artifacts/deployment-unit-results.json and deployment-browser-results.json. Source scan: 188 files, no heuristic findings; diff whitespace check passed. Account and database progress is recorded below and in OWNER_NEXT_STEPS.md. This does not deploy the gateway or complete live provider acceptance. Earlier report binaries and the accepted batch below predate this follow-up.

Local feature batch verified: concrete generic contracts including bounded defaults, async practice, dependency-aware declaration/call index reuse, literal fetch/Express candidate diagrams, exact source excerpts and keyboard/mobile navigation improvements. All 323 unit/integration tests in 38 files and the production build passed. All 34 Edge journeys (96.60 seconds), 34 Firefox 157 journeys (115.71 seconds) and five development-mode journeys passed with no failures, skips or retries. Source heuristic scan: 184 files, no findings. This batch is local only; version 17 stays live and no new GitHub push or deployment occurred.


## Owner decisions

Strict zero spend: no paid services, billing, overages, payment methods or top-ups. MIT/public publication approved. On 16 October the user explicitly rejected repeated deployment after each small update: batch subsequent work locally rather than creating a version for every change. Coding Pet is silent and reactions-only; no tutor/chat/voice. Core learning requires no account or model. The old 5% reserve is revoked. Continue in this chat without handover. Keep this file current for recovery.

## Latest release

Version 17 is public at https://reporecode-learning-lab.milkyibex8.chatgpt.site. Sites source be79ddeaecab5674913d3f45cf715c3a5b99bc50; saved version appgprj_6acb65fab51c8191895a8630c3ce9334~appgver_90c200adc2bc81918bcfe0e5983808a2; deployment appgdep_6ad1c825be348191bd1854302e8e0045 succeeded. Source ZIP: HTTP 200, 204 files, 3478879 bytes, SHA-256 d166d10d508e4210f18b7478bea8a8938463cc5fbae17217f7748662c099204d; matched the published release package. Later local builds may replace the local ZIP.

GitHub commit 6f49133e23b837bcfbf5630c550a4070d05f8995 passed run 38863042315: https://github.com/abhiram0411/RepoRecode/actions/runs/38863042315. Full public run: 29 passed, 1 intentionally skipped, 0 failed (174.58 seconds).

Receipts: artifacts/deployment.json, source-download.json, public-browser-results-v17.json and github-ci-v17.json. The immutable release archive cannot contain its own later receipts.

## Verified implementation

Local CSS module default imports scope up to 200 class/ID names per file, including explicit nesting and interactive previews. Composition/global module selectors remain omitted; named/namespace and bound plain-CSS imports are unsupported. State diagrams trace two const-initializer steps with source links and readable numbered arrows. Local CSS supports explicit & nesting and media declarations to four combined block levels, with unchanged resource restrictions. Small inherited-interface practice preserves readonly/optional fields, named imports and finite input coverage; ambiguous inheritance remains unsupported. The local batch advances analysis version to 9 for safe index refresh.

Practice retains two object levels, three scalar leaves, 16 object samples and 64 probes. Inheritance resolution rejects conflicting/duplicate fields, cycles, merged/constrained-generic/qualified/non-interface bases and excessive expansion. Existing imports, learning, practice, progress transfer, 15 themes, silent pet, isolated previews and cloud/gateway code are retained.

Public feedback offers reviewed GitHub drafts and full-text copy fallback. Anonymous local feedback remains supported with a configured gateway; anonymous hosted delivery is unconfigured. No automatic GitHub issue submission or paid infrastructure was added.

The DOCX and PDF reports were regenerated on 23 October 2026 from the current local batch, including default generic support and final 323-test/Edge/Firefox evidence. All eight pages were rendered and visually inspected. The report distinguishes local source from public version 17.

## Historical failures preserved

The user-reported GitHub theme failures on b320297 were fixed by synchronously saving validated preferences before IndexedDB. Original assertion retained; regression blocks database writes. Version 11 application f951441 and documentation/test 54f7463 passed runs 38692161774 and 38693583186. Old failed runs remain historical.

Version 11 full live run: 19 passed, 1 skip, 2 five-second assertion timeouts while grading/rendering was pending. Completion waits were added without weakening results; both targeted repeats passed. Receipts remain separate. Versions 12 and 14 each have a distinct successful full public run.

## Exact remaining work

1. Continue the implementation backlog in MASTER_SPEC.md and FEATURES.md: generic functions, constrained generic types and deeper input domains; persistent indexing/automatic source watching; broader indirect state/data/API relationships and isolated preview dependencies/frameworks. Concrete generic contracts, locally settled async practice, dependency-aware declaration/call reuse and literal fetch/Express candidates are implemented locally. Preserve finite coverage and truthful unsupported labels.
2. Anonymous public feedback needs genuinely free same-origin durable storage with a hard zero-spend stop. Static Sites does not run the Node gateway. Local feedback works; the new GitHub draft flow offers public feedback separately, while anonymous hosted delivery/admin remain unavailable. Do not enable potentially billable D1/Workers/storage without establishing the zero-cost constraint.
3. Supabase project and database schema are configured; application public keys, Auth URLs, GitHub/Google sign-in providers and the private-repository GitHub App remain unconfigured. Vercel's separate deployment GitHub App now has approved access. Provider acceptance needs real two-account RLS/MFA/recovery/linking/deletion/cloud restore/private repository checks and separate simultaneous PostgreSQL connections. Individual-device session inventory remains unfinished. Never ask for secrets in chat.
4. Manual accessibility/WebKit/low-end performance, Docker execution, independent security assessment and operator contacts remain. Docker engine was unavailable; PGlite is single-connection and cannot prove real locks/provider acceptance. Optional local Ollama remains unimplemented; no paid model is authorized.
5. Keep reports, resume and actual deployment/CI receipts synchronized. Do not publish local Git histories blindly. Full master specification is incomplete; do not call this production certification.

## Engineering map and release procedure

- apiRelations.ts, ApiRelationships.tsx and Graph.tsx: bounded method/path candidates. SourceLocation.tsx opens top-level source with highlighted lines. e2e/api-paths.spec.ts verifies no imported network requests, source jumps, keyboard focus, axe checks and mobile graph bounds.
- Graph resize uses internal measured node bounds; the public initialization flag can reset after symbol changes. useDialog preserves the real opener through StrictMode effect replay.

- src/core/practiceTypes.ts, practiceInputs.ts, analyze.ts, evaluate.ts; components/CodeEditor.tsx: named contracts. tests/namedInputs.test.ts: 19 cases; tests/objectInputs.test.ts: 23 cases; e2e/nested-inputs.spec.ts: nested rewrite/reload and mobile support. e2e/named-inputs.spec.ts: real import/rewrite/reload.
- src/core/storage.ts; tests/preferencesStorage.test.ts (5); e2e/themes.spec.ts: synchronous preference persistence and fallbacks.
- src/core/analysisSession.ts/createAnalyzer and workers/analyze.worker.ts: one-snapshot parsing and dependency-aware declaration/call cache; compiler binding and state/API relationships rebuilt.
- hookSites.ts/stateRelations.ts, scripts/interactive-renderer.mjs and LivePreview.tsx: hook observations/static links; no complete data-flow claims.
- previewStyles.ts/interactivePreview.ts: bounded sanitized local CSS and per-session reuse.
- server/github.mjs/githubStore.mjs and migration 006: shared state/refresh leases; local PGlite lifecycle and migration checks.
- server/community.mjs: bounded single-process local feedback; public same-origin backend remains unconfigured.

Use Node 24. npm ci --ignore-scripts; npm test -- --maxWorkers=2; npm run build. Leave TEST_URL unset and set LOCAL_COMMUNITY_E2E=true for npx playwright test to manage its own local preview. Public tests use TEST_URL and must unset LOCAL_COMMUNITY_E2E; save distinct JSON receipts, never overwrite local proof. Windows defaults to Edge; GitHub uses Chromium. Set PLAYWRIGHT_BROWSER=firefox and a separate PLAYWRIGHT_JSON_OUTPUT_FILE with --reporter=list,json for Firefox acceptance (Firefox 157 installed locally). Do not run both suites concurrently against the shared test server.

Root checkout is Sites source history. tmp/github-v10 is the separate GitHub main checkout created from public source, now with normal follow-up commits. Preserve both. Root has newer post-publication documentation/evidence changes; the published immutable ZIP cannot include its own receipt. Only synchronize reviewed public files into GitHub; never push root Sites history or credentials there.

Sites skill source helper owns root commit/push/package. Resolve its path from the current skill catalog before a planned release; the previous release used plugin version 1.0.1. Read hosting.json; reuse project appgprj_6acb65fab51c8191895a8630c3ce9334 and public audience. Windows needs Git bin/usr/bin/cmd on PATH and TAR_OPTIONS=--force-local. Pass fresh credentials through hidden stdin only. Do not reset dirty files.

Report: scripts/build-report.py uses bundled Python; scripts/export-report.ps1 uses installed Word and Poppler renders PDF pages. Update/inspect all pages after any report change. Reports are ignored binaries; source markdown/script are tracked. See latest journal entry for the final report verification status.

Development-mode practice and preview also passed all 5 regression journeys. Vite excludes QuickJS binary variants from dependency prebundling so WASM URLs remain valid, and prepares parse5/css-tree before first preview to prevent optimizer reloads. CI includes a separate development-server acceptance step; that changed workflow has not run on GitHub because this batch remains unpublished.

Default generic arguments resolve in declaration scope, including defaults referring to earlier parameters and defaults on inherited/imported interfaces. The read-only type context preserves defaults with imported type names expanded locally. Missing required arguments, forward/self references, invalid required-after-default ordering, constraints and shapes outside the existing bounds remain unsupported.

Account setup update, 23 October 2026: owner signed into Vercel (personal Hobby team) and Supabase (existing Free organization guaigpyjtkwcatnzpjbp), and completed the database password/project creation. RepoRecode reference is oppotpgwkhyzgidjuonc, region Tokyo, NANO, Free. Two unrelated paused projects were not changed. Initial dashboard SQL authentication failed temporarily, then succeeded without intervention. Confirmed empty public schema, applied migrations 001-006 in one transaction, and verified six RLS-enabled tables with no anonymous reads plus nine server-only functions. This is catalog verification, not two-account acceptance. SQL editor application did not register CLI migration history; do not rerun these non-idempotent migrations.

Owner approved adding only RepoRecode to the existing Vercel GitHub App selection (other two selections preserved). GitHub confirmed installation completed; Vercel now lists RepoRecode. Import form is open for repo-recode under Hobby, Vite, root ./; neither Create Project nor Deploy has been submitted. No public keys were copied or configured, and no OAuth providers/Auth URLs were changed.

Publishing stop point: reviewed 228-file source archive was synchronized into tmp/github-v10; checkout is dirty and has no configured remote. Public main was verified still at 6f49133e23b837bcfbf5630c550a4070d05f8995. No commit/push or deployment occurred. The latest setup notes, owner checklist, read-only supabase/verify.sql and Supabase evidence were subsequently copied into staging. The ZIP still predates these setup notes; the next build will regenerate it. Preserve staging and do not rerun the clean-only helper against it. Root remains the separate Sites history. Evidence: artifacts/supabase-setup.json, supabase-schema-verified.png and supabase-functions-verified.png. Final source heuristic scan: 190 files, no findings.

The initial fresh npm audit request was blocked by the approval-review usage limit. On the owner's next request to continue, the retry was approved and `npm audit --audit-level=high` completed successfully with **0 vulnerabilities**. Public main was rechecked at 6f49133e23b837bcfbf5630c550a4070d05f8995. Proceed with the reviewed batch, verify GitHub CI and perform one deliberate Vercel deployment. OWNER_NEXT_STEPS.md gives the owner exact steps and unresolved engineering work.
