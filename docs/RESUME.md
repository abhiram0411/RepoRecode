# RepoRecode development status

Updated 16 October 2026. Continue the existing project; preserve uncommitted work. The full master specification remains unfinished. The user explicitly asked to keep working in this chat and not hand over to another AI; maintain this file only as a recovery record.

## Active work

Draft PR #1 (`codex/remove-companion-20261016`) includes companion removal, cycle-safe roadmaps, ZIP integrity checks, graph failure diagnostics, offline system fonts, retired admin UI counters and server-side tutor-budget cleanup through commit `2869992f3519bb9832d9a264a4d76ab72cdf6c64`. GitHub Actions runs 39306843432 and 39443097932 passed unit and Chromium browser tests, build and security checks on the respective commits. Documentation updates are prepared for review on this branch. PR #1 remains draft, unmerged and undeployed; intermittent graph visibility and live-provider acceptance are still open.

CSS Modules local acceptance: 273 tests in 34 files passed; production build passed; all 30 local Edge browser journeys passed (88.76 seconds). Source scan: 173 files with no heuristic findings. The new CSS Modules screenshot was inspected. Publication and public/GitHub verification are pending.

Current local source: 265 tests in 33 files passed; production build passed. Latest completed local browser run: 29 passed, 0 failed (98.99 seconds). Source scan: 171 files, no heuristic findings. No dependencies changed; large compiler/editor/VM bundles remain a limitation.

## Owner decisions

Strict zero spend: no paid services, billing, overages, payment methods or top-ups. MIT/public publication approved. Coding Pet/companion is retired in the separate review branch; the independent profile avatar remains. No tutor/chat/voice. Core learning requires no account or model. The old 5% reserve is revoked. The latest user instruction is to continue in this chat, use available capacity and not hand over. Keep this file current for recovery.

## Latest release

Version 16 is public at https://reporecode-learning-lab.milkyibex8.chatgpt.site. Sites source 0495f784288d5bea8b39a559c6121841147b3e70; saved version appgprj_6acb65fab51c8191895a8630c3ce9334~appgver_3f024904d8ec81918e0c45f8bebab290; deployment appgdep_6ad16d62fc348191904160e99cb2f77d succeeded. Source ZIP: HTTP 200, 201 files, 3346241 bytes, SHA-256 63563ba5ee093af46878ba36ade66491289d94fd67fb429c640951859229c3fa; matched the published release package. Later local builds may replace the local ZIP.

GitHub commit 7c14b19ac3115408bae95dbb51c0736930485c18 passed run 38828699771: https://github.com/abhiram0411/RepoRecode/actions/runs/38828699771. Full public run: 28 passed, 1 intentionally skipped, 0 failed (167.54 seconds).

Receipts: artifacts/deployment.json, source-download.json, public-browser-results-v16.json and github-ci-v16.json. The immutable release archive cannot contain its own later receipts.

## Verified implementation

State diagrams trace two const-initializer steps with source links and readable numbered arrows. Local CSS supports explicit & nesting and media declarations to four combined block levels, with unchanged resource restrictions. Small inherited-interface practice preserves readonly/optional fields, named imports and finite input coverage; ambiguous inheritance remains unsupported. Analysis version 7 enables index refresh.

Practice retains two object levels, three scalar leaves, 16 object samples and 64 probes. Inheritance resolution rejects conflicting/duplicate fields, cycles, merged/generic/qualified/non-interface bases and excessive expansion. Existing imports, learning, practice, progress transfer, 15 themes, independent profile avatar, isolated previews and cloud/gateway code are retained.

Public feedback offers reviewed GitHub drafts and full-text copy fallback. Anonymous local feedback remains supported with a configured gateway; anonymous hosted delivery is unconfigured. No automatic GitHub issue submission or paid infrastructure was added.

Word/PDF report binaries were regenerated for version 16 and all eight rendered pages inspected on 16 October 2026; no clipping or broken tables were found.

## Historical failures preserved

The user-reported GitHub theme failures on b320297 were fixed by synchronously saving validated preferences before IndexedDB. Original assertion retained; regression blocks database writes. Version 11 application f951441 and documentation/test 54f7463 passed runs 38692161774 and 38693583186. Old failed runs remain historical.

Version 11 full live run: 19 passed, 1 skip, 2 five-second assertion timeouts while grading/rendering was pending. Completion waits were added without weakening results; both targeted repeats passed. Receipts remain separate. Versions 12 and 14 each have a distinct successful full public run.

## Exact remaining work

1. Continue the implementation backlog in MASTER_SPEC.md and FEATURES.md: deeper/generic/asynchronous practice contracts, incremental semantic indexing beyond the current parsing cache, indirect state/data/API relationships and broader isolated React dependencies/styles/frameworks. Preserve finite coverage and truthful unsupported labels.
2. Anonymous public feedback needs genuinely free same-origin durable storage with a hard zero-spend stop. Static Sites does not run the Node gateway. Local feedback works; the new GitHub draft flow offers public feedback separately, while anonymous hosted delivery/admin remain unavailable. Do not enable potentially billable D1/Workers/storage without establishing the zero-cost constraint.
3. Supabase/OAuth/GitHub App are unconfigured. Setup instructions are ready in SERVICE_SETUP.md; no keys are required for core learning. Provider acceptance needs the owner's setup, real two-account RLS/MFA/recovery/linking/deletion/cloud restore/private repository checks and separate simultaneous PostgreSQL connections. Individual-device session inventory remains unfinished. Never ask for secrets in chat.
4. Manual accessibility/additional browsers/low-end performance, Docker execution, independent security assessment and operator contacts remain. Docker engine was unavailable; PGlite is single-connection and cannot prove real locks/provider acceptance. Optional local Ollama remains unimplemented; no paid model is authorized.
5. Keep reports, resume and actual deployment/CI receipts synchronized. Do not publish local Git histories blindly. Full master specification is incomplete; do not call this production certification.



## Engineering map and release procedure

- src/core/practiceTypes.ts, practiceInputs.ts, analyze.ts, evaluate.ts; components/CodeEditor.tsx: named contracts. tests/namedInputs.test.ts: 19 cases; tests/objectInputs.test.ts: 23 cases; e2e/nested-inputs.spec.ts: nested rewrite/reload and mobile support. e2e/named-inputs.spec.ts: real import/rewrite/reload.
- src/core/storage.ts; tests/preferencesStorage.test.ts (5); e2e/themes.spec.ts: synchronous preference persistence and fallbacks.
- src/core/analysisSession.ts/createAnalyzer and workers/analyze.worker.ts: reusable one-snapshot parsing cache; semantic relationships rebuilt.
- hookSites.ts/stateRelations.ts, scripts/interactive-renderer.mjs and LivePreview.tsx: hook observations/static links; no complete data-flow claims.
- previewStyles.ts/interactivePreview.ts: bounded sanitized local CSS and per-session reuse.
- server/github.mjs/githubStore.mjs and migration 006: shared state/refresh leases; local PGlite lifecycle and migration checks.
- server/community.mjs: bounded single-process local feedback; public same-origin backend remains unconfigured.

Use Node 24. npm ci --ignore-scripts; npm test -- --maxWorkers=2; npm run build. Leave TEST_URL unset and set LOCAL_COMMUNITY_E2E=true for npx playwright test to manage its own local preview. Public tests use TEST_URL and must unset LOCAL_COMMUNITY_E2E; save distinct JSON receipts, never overwrite local proof. Windows uses Edge; GitHub uses Chromium.

Root checkout is Sites source history. tmp/github-v10 is the separate GitHub main checkout created from public source, now with normal follow-up commits. Preserve both. Root has newer post-publication documentation/evidence changes; the published immutable ZIP cannot include its own receipt. Only synchronize reviewed public files into GitHub; never push root Sites history or credentials there.

Sites skill source helper owns root commit/push/package. Current plugin path: C:/Users/ABHIRAM/.codex/plugins/cache/openai-curated-remote/sites/1.0.1. Read hosting.json; reuse project appgprj_6acb65fab51c8191895a8630c3ce9334 and public audience. Windows needs Git bin/usr/bin/cmd on PATH and TAR_OPTIONS=--force-local. Pass fresh credentials through hidden stdin only. Do not reset dirty files.



Report: scripts/build-report.py uses bundled Python; scripts/export-report.ps1 uses installed Word and Poppler renders PDF pages. Update/inspect all pages after any report change. Reports are ignored binaries; source markdown/script are tracked. See latest journal entry for the final report verification status.
