# RepoRecode continuation checkpoint

Updated 15 October 2026. Continue the existing project; preserve uncommitted work. The full master specification remains unfinished. The user explicitly asked to keep working in this chat and not hand over to another AI; maintain this file only as a recovery record.

## Active work after version 13

State relationships trace up to two const-initializer steps in the same function, with intermediate source links. Bounds: 200 candidate bindings, eight paths per binding, 200 indexed relationships and 60 diagram arrows. Calls, property access, mutation, mutable aliases and closures are excluded from propagation. This is lexical source evidence, not evaluated values or execution order. Analysis version 6 enables refresh of old indexes. Numbered arrows and a keyboard-accessible relationship picker keep full explanations and source links readable.

243 tests in 31 files and the production build passed. All 27 local Edge journeys passed (79.19 seconds) after the diagram refinement. The state-chain screenshot was inspected. The relationship picker, intermediate source controls and mobile width passed. Source scan: 167 files, no heuristic findings. Publication pending.

## Owner decisions

Strict zero spend: no paid services, billing, overages, payment methods or top-ups. MIT/public publication approved. Coding Pet is silent and reactions-only; no tutor/chat/voice. Core learning requires no account or model. The old 5% reserve is revoked. The latest user instruction is to continue in this chat, use available capacity and not hand over. Keep this file current for recovery.

## Latest release

Version 13 is public at https://reporecode-learning-lab.milkyibex8.chatgpt.site. Sites source commit: 9c4a2d45fc98b2bd473a06aa43eb57922328d558. Saved version: appgprj_6acb65fab51c8191895a8630c3ce9334~appgver_86ef35d9c8f881918ad2e8f7c67b3b18. Deployment: appgdep_6ad1017947908191bcd98f5b0a952fe6, status succeeded. Source ZIP: HTTP 200, 191 files, 2836100 bytes, SHA-256 d3ebeab67562b2b77157621afa27d637e4701e77cc901c96817b533b9890329b; matched the version 13 package. Local builds for later work may replace the package.

GitHub commit 9b1298ed9cda294baee82046cec63129f26837e6 passed run 38770487895: https://github.com/abhiram0411/RepoRecode/actions/runs/38770487895. Install, 235 tests, build, dependency audit, source scan and all 26 Chromium journeys passed.

Receipts: artifacts/deployment.json, source-download.json, public-browser-results-v13.json, public-feedback-retry-v13.json and github-ci-v13.json. Published ZIP is immutable and cannot contain its own later deployment receipt. Current documentation/evidence updates are newer than its source snapshot.

## Verified implementation

Practice accepts two object levels with three scalar leaves across each parameter, preserving missing/undefined containers and fields. Required independent variations must fit 16 object samples; wider shapes are rejected. The overall cap remains three parameters and 64 probes. Nested named aliases/interfaces and readonly leaves are tested. The nested-practice release used analysis version 5; the current state-chain update uses version 6. Footer and Support links now point to the public GitHub repository and issues.

Version 13 local checks: 235 tests in 30 files passed (12.79 seconds); TypeScript/Vite build passed; all 26 Edge journeys passed (75.28 seconds). Source scan: 163 files, no heuristic findings. Full public run: 24 passed, 1 local-only skip, 1 failed because the test's broad write observer counted the host's independent Cloudflare bot-check POST. Scoped the assertion to app API/GitHub writes, preserving the no-automatic-feedback-submission check. All three feedback repeats passed (12.3 seconds). Keep original and retry receipts; this is not a newly all-green full public run. No dependencies changed; hosted audit passed. Large compiler/editor/VM bundles remain a limitation.

Public feedback now offers user-reviewed GitHub issue drafts and full-text copy fallback, with public visibility/account requirements explained. Anonymous hosted delivery remains unavailable. Status fetch has an eight-second deadline; feedback and activity flags are independent. The mobile Preferences overflow found by the new test is fixed. Existing PDF/DOCX binaries currently describe version 12; regenerate and visually inspect after the next accepted release.

The first build found a TypeScript narrowing error in the new nested-object branch; the direct type guard corrected it and the rebuild passed. The first approval review timed out; its allowed retry succeeded. Neither remains blocked. Nested-practice and mobile Support screenshots were inspected.

Earlier foundation: bounded GitHub/folder/ZIP imports; TypeScript declaration/reference analysis; source lessons, roadmaps, missions, typed predictions, reflections, Monaco; isolated initial/interactive React with observed hooks/direct state relationships; sanitized local CSS; atomic source refresh/cloud restore; local progress transfer; 15 palettes/device following; silent customizable pet; optional local feedback/admin; shared GitHub PKCE/refresh lifecycle and six SQL migrations.

## Historical failures preserved

The user-reported GitHub theme failures on b320297 were fixed by synchronously saving validated preferences before IndexedDB. Original assertion retained; regression blocks database writes. Version 11 application f951441 and documentation/test 54f7463 passed runs 38692161774 and 38693583186. Old failed runs remain historical.

Version 11 full live run: 19 passed, 1 skip, 2 five-second assertion timeouts while grading/rendering was pending. Completion waits were added without weakening results; both targeted repeats passed. Receipts remain separate. Version 12's full run above now passes every applicable public journey.

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
