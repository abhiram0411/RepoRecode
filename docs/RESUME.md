# RepoRecode continuation checkpoint

Updated 15 October 2026. Continue the existing project; do not rebuild or discard changes. The full specification is not finished.

## Owner decisions

Strict zero spend: no paid services, billing, overages, payment methods or top-ups. MIT and public publication approved. Coding Pet is silent and reactions-only: no tutor/chat/TTS/STT. Core learning needs no account or model. Old 5% reserve is revoked. Continue implementation beyond release checkpoints; before the final interruption update this file and provide the next-AI prompt.

## Latest publication

Public website: https://reporecode-learning-lab.milkyibex8.chatgpt.site

Version 11 succeeded. Sites source commit: 5536942fbd333ebbb5d9d55f64d7ccacf4fb0cdf. Saved version: appgprj_6acb65fab51c8191895a8630c3ce9334~appgver_74dfdb8a169c819181e665fa91ab7ca3. Deployment: appgdep_6ad0725c45608191aaabbe8adfb45f1c. Source ZIP: HTTP 200, 185 files, 2528775 bytes, SHA-256 14d733f9719d4f1a4fcf320ea7754e7cecc9747d5fb7592eb1cf951870dfc70e; matches local package. artifacts/deployment.json and source-download.json are authoritative.

GitHub: https://github.com/abhiram0411/RepoRecode. Published application commit f951441e41257d73a442f6aee97adfbd777e436a passed CI run 38692161774: https://github.com/abhiram0411/RepoRecode/actions/runs/38692161774. Installation, 228 tests, build, dependency audit, source scan and all 22 Chromium browser journeys passed. Subsequent docs/test-only commits should retain that application verification and record their own CI separately.

## Verification

228 tests in 30 files passed in 14.56 seconds. TypeScript/Vite production build passed. All 22 local browser journeys passed in 89.08 seconds. Source scan checked 160 files without heuristic findings. Dependencies unchanged; hosted audit passed. Large compiler/editor/VM bundles remain a performance limitation.

Version 11 full live run: 19 passed, 1 local-only skip, 2 failed. Two five-second assertions expired while work was still pending: nullable/default grading and the styled preview's transition from initial HTML to interactive events. Tests now allow 30 seconds for those existing completion signals, retaining the result assertions. Both targeted public repeats: 2 passed, 0 failed in 37.32 seconds. Preserve both receipts; this is not a newly all-green full live run. Receipts: artifacts/public-browser-results-v11.json and public-practice-retry-v11.json.

## Latest implementation and resolved issue

Named-input support resolves bounded simple aliases and plain interfaces through relative imports/reexports. Original source names remain; visible read-only definitions and Monaco context are provided. Existing parameter/probe/object bounds remain. Recursive/generic/inherited/merged/namespace-qualified types and body-local type dependencies stay unsupported. ANALYSIS_VERSION=4 enables saved-index refresh.

The user reported GitHub failure notifications. Runs 38657450520 and 38683512075 failed immediate light-theme persistence; both otherwise passed install/unit/build/audit/scan. Preferences now write validated localStorage synchronously before IndexedDB and prefer that copy on load. Blocked/invalid storage falls back to the database; stale copies are removed on quota failures when possible. Five tests and a browser regression with database writes prevented cover the fix. The original failing assertion is unchanged. CI run 38692161774 passed after the fix. Old failed runs remain historical.

Earlier implemented foundation: bounded public GitHub/folder/ZIP imports, declaration/reference analysis, source lessons and roadmaps, finite function/component practice, typed predictions, missions/reflections, Monaco, isolated initial/interactive React with observed hooks and direct state diagrams, sanitized cached local CSS, atomic source-index refresh and cloud restore, local progress transfer, 15 palettes/device themes, silent customizable pet, optional local feedback/admin, GitHub shared PKCE/refresh lifecycle and all six SQL migrations. No AI tutor or paid service is enabled.

## Exact remaining work

1. Continue the implementation backlog in MASTER_SPEC.md and FEATURES.md: nested/generic/asynchronous practice contracts, incremental semantic indexing beyond the current parsing cache, indirect state/data/API relationships and broader isolated React dependencies/styles/frameworks. Preserve finite coverage and truthful unsupported labels. The Support modal still has outdated repository-unconfigured wording; replace it with the verified GitHub link in the next UI release.
2. Public feedback needs genuinely free same-origin durable storage with a hard zero-spend stop. Static Sites does not run the Node gateway. Local feedback works; public delivery/admin remain deliberately unavailable. Do not enable potentially billable D1/Workers/storage without establishing the zero-cost constraint.
3. Supabase/OAuth/GitHub App are unconfigured. Setup instructions are ready in SERVICE_SETUP.md; no keys are required for core learning. Provider acceptance needs the owner's setup, real two-account RLS/MFA/recovery/linking/deletion/cloud restore/private repository checks and separate simultaneous PostgreSQL connections. Individual-device session inventory remains unfinished. Never ask for secrets in chat.
4. Manual accessibility/additional browsers/low-end performance, Docker execution, independent security assessment and operator contacts remain. Docker engine was unavailable; PGlite is single-connection and cannot prove real locks/provider acceptance. Optional local Ollama remains unimplemented; no paid model is authorized.
5. Keep reports, resume and actual deployment/CI receipts synchronized. Do not publish local Git histories blindly. Full master specification is incomplete; do not call this production certification.

## Engineering map and release procedure

- src/core/practiceTypes.ts, practiceInputs.ts, analyze.ts, evaluate.ts; components/CodeEditor.tsx: named contracts. tests/namedInputs.test.ts: 18 cases. e2e/named-inputs.spec.ts: real import/rewrite/reload.
- src/core/storage.ts; tests/preferencesStorage.test.ts (5); e2e/themes.spec.ts: synchronous preference persistence and fallbacks.
- src/core/analysisSession.ts/createAnalyzer and workers/analyze.worker.ts: reusable one-snapshot parsing cache; semantic relationships rebuilt.
- hookSites.ts/stateRelations.ts, scripts/interactive-renderer.mjs and LivePreview.tsx: hook observations/static links; no complete data-flow claims.
- previewStyles.ts/interactivePreview.ts: bounded sanitized local CSS and per-session reuse.
- server/github.mjs/githubStore.mjs and migration 006: shared state/refresh leases; local PGlite lifecycle and migration checks.
- server/community.mjs: bounded single-process local feedback; public same-origin backend remains unconfigured.

Use Node 24. npm ci --ignore-scripts; npm test -- --maxWorkers=2; npm run build. Leave TEST_URL unset and set LOCAL_COMMUNITY_E2E=true for npx playwright test to manage its own local preview. Public tests use TEST_URL and must unset LOCAL_COMMUNITY_E2E; save distinct JSON receipts, never overwrite local proof. Windows uses Edge; GitHub uses Chromium.

Root checkout is Sites source history. tmp/github-v10 is the separate GitHub main checkout created from public source, now with normal follow-up commits. Preserve both. Root has newer post-publication docs/test/evidence changes; the published immutable ZIP cannot include its own receipt. Only synchronize reviewed public files into GitHub; never push root Sites history or credentials there.

Sites skill source helper owns root commit/push/package. Current plugin path: C:/Users/ABHIRAM/.codex/plugins/cache/openai-curated-remote/sites/1.0.1. Read hosting.json; reuse project appgprj_6acb65fab51c8191895a8630c3ce9334 and public audience. Windows needs Git bin/usr/bin/cmd on PATH and TAR_OPTIONS=--force-local. Pass fresh credentials through hidden stdin only. Do not reset dirty files.

Report: scripts/build-report.py uses bundled Python; scripts/export-report.ps1 uses installed Word (needs normal approved execution if sandbox returns COM access denied). Poppler rendered all eight PDF pages, all visually inspected. Current PDF/DOCX records version 11, 228 tests, 22 local browser journeys and successful fixed GitHub CI; it is a development report. Reports are ignored binaries, source markdown/script are tracked.
