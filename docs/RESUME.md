# RepoRecode continuation checkpoint

Updated 14 October 2026. Read this first, MASTER_SPEC.md, FEATURES.md and SERVICE_SETUP.md. Continue the existing source; preserve working-tree changes. The full specification is not finished. The user explicitly asked not to end work merely because a release checkpoint is reached; continue remaining implementation in order.

## Current work — public version 9 plus the next local update

- Expanded bounded function inputs: scalar literal unions, nullable/undefined scalars, optional/default parameters, boolean and readonly scalar arrays, fixed tuples up to three scalar entries. At most three parameters and 64 probes remain. Shared input generation preserves omitted/undefined/null distinctions. Exercise stubs retain source parameter declarations. Local types named Array are not mistaken for built-in arrays.
- Added ANALYSIS_VERSION and a saved-project refresh action. New imports/backups get current metadata. Reimporting an identical stale snapshot refreshes its index. Atomic refresh reads the newest learning data and modifies only analysis/lessons/version; concurrent drafts/notes survive and deleted/changed-source projects are rejected.
- Predictions now compare typed output keys, accept top-level undefined/NaN/Infinity/-Infinity, and accept reordered object fields. Compound outputs JSON cannot express are excluded honestly; no answer text is executed.
- GitHub integration now uses shared hashed one-use OAuth state, encrypted PKCE/access/refresh credentials, a database refresh lease and conditional completion. Disconnect/reconnection cannot be undone by late callback/refresh writes. Migration 006 and server/githubStore.mjs are required. tests/githubLifecycle.test.ts executes actual PostgreSQL SQL with injected provider responses (18 cases); tests/database.test.ts executes all six migrations and checks two-owner isolation, bounds, privileged access and cascades (6 cases). PGlite is single-connection, not proof of multi-connection locks or live Supabase/GitHub.
- Local CSS imports now render in isolated React previews. CSS-tree reconstructs allowed rules/declarations, blocks URL/raw/unknown function values and external import/font rules, escapes HTML closing delimiters, and caps parsing/rule/byte counts. Side-effect plain CSS imports retain execution order; CSS modules, bound imports, nesting and animations are unsupported. The UI reports omitted styles. tests/previewStyles.test.ts has 15 passing cases. e2e/styles.spec.ts passes and artifacts/styled-preview.png was visually inspected. Preview-server sandbox isolation initially prevented browser access; the approved loopback preview resolved it. The test also now waits for the interactive snapshot instead of clicking the previous initial-render snapshot.
- Optional device-theme following is implemented and browser-tested in preferences/useWorkspaceTheme.ts; it listens for light/dark changes, updates the editor and preserves the manual palette.
- Added declaration-resolved state relationships: direct const hook tuple reads, setter/dispatch calls, initializer and JSX prop references. Source-linked list (200 cap) and diagram (60 cap) exclude shadowed/type-only/non-React identities and label static evidence. No alias/indirect propagation or execution-order claim. Analysis version 2 introduced state links; the current version is 3 for object practice. tests/stateRelations.test.ts (6 cases) and e2e/state-relations.spec.ts pass. The graph-layout fix passed its targeted repeat check; graph controls also use theme colors.
- Version 9 published the features above. New local work adds inline-object practice (three scalar fields / 16 object samples), safe missing/undefined/null and quoted-key inputs, startup recovery when scripts fail, and session-local stylesheet caching. The cache sanitizes each loaded stylesheet once, validates paths/order/aggregate limits on every action, and clears on disposal. Analysis version is 3.
- Latest unit run: **205 tests across 28 suites passed** in 13.16 seconds. The final production build and all **20 local browser journeys passed** (1.3 minutes). Object-practice and startup-recovery screenshots were visually inspected. Existing report pages were inspected, but must be regenerated for the final new evidence.
- New source files: practiceInputs.ts, functionStub.ts, prediction.ts, analysisVersion.ts. New unit suites: practiceInputs.test.ts (20 cases), objectInputs.test.ts (17 cases), styleSession.test.ts (4 cases), prediction.test.ts (8 cases); storage suite now 6 cases. Follow these with remaining integration/runtime work, not an early final reply.

## Owner decisions

- Strict zero spending: no paid APIs/plans/overages/payment methods/top-ups. Core learning works locally without an account, database or model.
- MIT and public publication are approved. Preserve the existing Sites project and public audience.
- Coding Pet is silent and reactions-only. No tutor/chat/TTS/STT. Explanations stay in the learning workspace. Optional local Ollama is allowed but unimplemented.
- The old 5% reserve is revoked. Work to a stable checkpoint before interruption, record exact remaining work and provide a continuation prompt.

## Public version 9 receipt

Public URL: https://reporecode-learning-lab.milkyibex8.chatgpt.site

Version 9 succeeded: commit 741954865bf3fbcdd04cd9c5da4c5531fbe00002; saved version appgprj_6acb65fab51c8191895a8630c3ce9334~appgver_279303e5c9688191ab9a19faca6e9298; deployment appgdep_6acf547ad87481919f392ac6674cd200. Source ZIP: HTTP 200, 174 files, 2,292,331 bytes, SHA-256 2f9d9675a19adec33f935532eeefa90f7ed34b87d833a7d09805fe5b58916f2b. Live suite: 16 passed, one local-only skip, one blank-startup timeout before the import button appeared. The component journey passed its diagnostic retry in 16.2 seconds. The initial failure is retained in artifacts/public-browser-results-v9.json and v9-startup-timeout.png; retry proof is public-component-retry-v9.json. Its exact root cause was not established; the subsequent local startup fallback provides a readable recovery path if script loading fails.

## Previous public version 8 milestone

Latest addition: incremental parsing within the existing 200-file / 2 MiB source limits. One reusable worker caches exact unchanged source trees from its latest snapshot; every request rebuilds semantic relationships. Removed exports, changed barrels and new resolution candidates are tested against fresh indexes. Graph references traverse each file once and use direct declaration lookup. Identical source hashes resume saved progress before analysis; changed snapshots are preserved separately. Worker deadlines/errors/deletion/unmount clear the cache. React state concepts now resolve aliases, and component study text no longer claims grading is unavailable. New regression and browser checks cover this behavior. No persistent cache, incremental semantic index or source watcher is claimed.

1. Added source-linked state observations in interactive React preview: resolved direct useState/useReducer imports, aliases/default/namespaces, shadowing checks, 100-read cap per action. Summaries are bounded and local; getters/toJSON are not invoked. Reads represent render order, including repeat renders and multiple instances, not a final state inventory or diff. No new hooks or altered hook return values.
2. Static state facts use the same resolved import evidence instead of name matching.
3. Fixed biased three-parameter practice probes: every parameter now varies before the remaining 64-case combination budget. Reference exclusions are reported; differing repeated outputs reject grading. Direct resolved Math.random access is rejected even when isolated runtimes share a seed.
4. Typed output comparison preserves missing/undefined/null/nonfinite distinctions, ignores plain-object key insertion order, preserves array order, rejects callable/cyclic/accessor and other unsupported outputs. Candidate declarations are scoped away from harness names. This remains finite testing of a bounded subset, not proof of general correctness or tamper-proof certification.
5. Component completions no longer inflate function mastery. Project cards count component candidates. Added short original page/roadmap/result movement; removed opacity fading after axe found transient contrast loss. App/OS reduced-motion settings disable motion.
6. Expanded browser checks cover state values/source navigation, component counts, reduced motion and preview color independence across workspace themes.
7. Updated API/architecture documentation and replaced the obsolete tutor-era report with an 8-page free-only engineering report. DOCX and PDF were generated and every page visually inspected. Its deployment table is generated from the actual local receipt; rebuild after a later publication if needed.

## Version 8 verification and publication history

- Production TypeScript/Vite build passed. Known large compiler/editor/VM chunk warnings remain.
- **110 tests in 20 suites passed**, using `npm test -- --maxWorkers=2`. An earlier unrestricted Windows run lost a forked worker; the bounded run passed all suites.
- **All 13 production-browser journeys passed in 42.8 seconds**, including disposable local community gateway checks and repeated source imports. Evidence: artifacts/unit-results.json and artifacts/browser-results.json. An initial browser run could not connect because the old preview session had expired; restarting it resolved those infrastructure failures. The sandbox also blocked test file realpath resolution; approved normal execution passed.
- Dependency audit: zero known vulnerabilities (dependencies unchanged). Heuristic source scan: 132 files, no common token/private-key matches. Neither is an independent security review.
- Report renderer could not find LibreOffice; installed Word exported the DOCX, then Poppler rendered all 8 PDF pages for visual inspection. Outputs: artifacts/RepoRecode-development-report.docx and .pdf. Source: docs/ENGINEERING_REPORT.md and scripts/build-report.py.

Public site: https://reporecode-learning-lab.milkyibex8.chatgpt.site
Source ZIP: https://reporecode-learning-lab.milkyibex8.chatgpt.site/downloads/reporecode-source.zip
Site ID: appgprj_6acb65fab51c8191895a8630c3ce9334

Version 8 is confirmed public, commit e7ed0e5293685d26e2ff7865ab6ae08e64d78d68, saved version appgprj_6acb65fab51c8191895a8630c3ce9334~appgver_ed651f3baad08191906e433379fb9cc9, deployment appgdep_6ace7063ca148191bb9ad1655cb268dd. Both targeted public checks passed (reimport/cache/preservation and automated accessibility), following all 13 local journeys. The source ZIP returned HTTP 200 and matches the local archive (153 files, 1,869,770 bytes, SHA-256 883f28b3d8f066d9cb67ebaf09d6b715bde81fd75ad84aed3f9422947ccb0294). Previous version 7 passed 11 live journeys with one local-only skip, retained in artifacts/public-browser-results-v7.json. **artifacts/deployment.json and source-download.json are authoritative for actual publication**. The immutable source ZIP cannot contain its own final commit/deployment hash. Preserve newer local post-publication receipts and screenshots. The first version 8 packaging attempt committed/pushed successfully but lacked Git Bash on PATH; retry with Git bin/usr/bin/cmd completed without changing the commit.

## Earlier delivered foundation

Bounded public GitHub/folder/ZIP imports; compiler index and source graphs; source lessons, function and component practice, missions, predictions/reflections; Monaco; isolated initial/interactive React; persisted drafts, XP and achievements; learning-only versioned progress transfer with source hashes/deduplication; atomic cloud restore planner; 15 matching palettes; distinct original customizable characters; reaction-only pet; local feedback/admin/opt-in activity with deletion tombstones; retired paid AI routes returning 410.

## Exact remaining work

1. Publish the verified next version, check its live behavior/download, and regenerate the report from that receipt. Version 9 is the last confirmed public release until a new receipt. Preserve local changes. At the final stopping point, leave a verified checkpoint and a copyable continuation prompt, as the user requested.
2. Public feedback needs a genuinely free same-origin durable backend with a hard spending stop. Current static Sites host has no Node API and truthfully shows feedback/admin unavailable. Do not fabricate metrics or enable billable storage.
3. Supabase/OAuth/GitHub App are unconfigured. User asked for setup instructions while building. Live two-account RLS, MFA, recovery, linking, deletion and selected private-repository acceptance remain pending. GitHub refresh/shared state have local implementation and PostgreSQL tests; live multi-replica acceptance and individual-device session inventory remain. Never request secrets in chat.
4. Public GitHub repository creation is still pending. Sites source Git and MIT ZIP exist; neither is a GitHub repository.
5. Broader practice contracts (nested objects, named types, asynchronous behavior), incremental semantic indexing beyond the parsing cache, deeper state/data/API relationships, fuller React dependencies/styles/async semantics and broader frameworks remain. Basic local CSS support is now implemented; CSS modules/nesting/animations are not. Preserve bounded execution and truthful unsupported labels.
6. Additional manual accessibility/mobile/browser and low-end performance review, Docker execution, independent security assessment and real operator/support details remain. System-theme following is implemented and browser-tested; local Ollama remains optional and unimplemented.
7. Reports are current development checkpoints, not final certification. Update their evidence after substantive changes; keep implementation, local acceptance, public deployment and provider-dependent acceptance distinct.

## Engineering map and commands

- src/core/analyze.ts/createAnalyzer, analysisSession.ts and workers/analyze.worker.ts: single-snapshot parsing cache, fresh symbol relationships, bounded reusable worker. tests/incrementalAnalysis.test.ts (8 cases), e2e/reimport.spec.ts (actual changed/identical imports).

- src/core/hookSites.ts; scripts/interactive-renderer.mjs; preview.ts and interactivePreview.ts; components/LivePreview.tsx: state observation and isolated rendering.
- src/core/evaluate.ts and outputCodec.ts: balanced probes and typed comparison. tests/probes.test.ts and stateObservation.test.ts add regression coverage.
- src/core/componentPractice.ts and worker; restorePlan.ts/storage.ts; progress.ts; themes.ts/pet.ts; useDialog.ts cover prior milestone.
- server/community.mjs and index.mjs: local community/authorization and retired AI routes.
- React 19.3.0 and reconciler 0.34.0 are pinned together. Rebuild generated runtimes with pretest/prebuild after renderer edits.

Node 24; npm ci --ignore-scripts; npm test -- --maxWorkers=2; npm run build. Preview: npm run preview -- --port 5181 --strictPort. Set TEST_URL=http://127.0.0.1:5181 and LOCAL_COMMUNITY_E2E=true before npx playwright test. Community tests use disposable local data on port 8788 and skip public targets. Windows uses Edge. Never execute imported package scripts.

Sites skill helper owns source commit/push/packaging. Read .openai/hosting.json; get existing site; mint credentials privately; open/prepare with site-workflow.mjs. On Windows prepend C:\Program Files\Git\bin, C:\Program Files\Git\usr\bin and C:\Program Files\Git\cmd to PATH, and set TAR_OPTIONS=--force-local. Git cmd alone does not provide the required bash executable. Pass credentials through hidden stdin only. Package exact pushed source with matching dist, save and deploy returned version, verify actual outcome and source hash. Do not reset dirty files or print credentials.
