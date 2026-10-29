# RepoRecode Engineering Report

Prepared for Abhiram on 28 October 2026

RepoRecode is a usable development release for learning from real JavaScript and TypeScript source. Its local learning workflow requires no account, database, model or payment method. This report describes implemented behavior, the recorded checks and the work still required by the master specification. It is not a claim of full product completion or an independent security assessment.

The owner approved MIT licensing and public publication. All spending remains prohibited, including paid plans, overages, payment methods and automatic top-ups. The Coding Pet is silent and reactions-only. Paid AI endpoints have been removed; optional local Ollama remains unimplemented.

| Evidence | Current record |
| --- | --- |
| Unit and integration checks | {{UNIT_TESTS}} tests passed |
| Latest Edge journeys | {{BROWSER_TESTS}} passed; {{BROWSER_FAILURES}} failed |
| WebKit journeys | 37 passed locally and in Linux CI |
| Deployed Vercel source | 5d58fcf with verified hosted backend |
| Source download | {{DOWNLOAD_STATUS}} |
| Last recorded dependency audit | {{VULNERABILITIES}} known vulnerabilities reported |
| External services | Supabase Free and Vercel Hobby connected; private GitHub App pending |
| Live API checks | Nine passed; synthetic writes and cleanup verified |

Public website: https://repo-recode.vercel.app/

Production remains on 5d58fcf. GitHub commit f5bf22b includes scalar-constrained practice and the WebKit correction, with 371 local unit tests and 37 journeys in each browser passing. Linux CI passed 371 tests, 37 Chromium, 37 WebKit and five development journeys; no deployment was made. The earlier c02a3d3 failure is preserved. Exact evidence is recorded in docs/RESUME.md and artifacts/.

### How to resume development

Read docs/RESUME.md, docs/MASTER_SPEC.md, docs/FEATURES.md and docs/SERVICE_SETUP.md. Preserve the existing working tree. Complete the listed remaining work using evidence from the actual implementation. Do not revive the tutor or add billable infrastructure.

## Architecture and data boundaries

[architecture]

React and Vite provide the browser interface. Monaco supplies source editing and React Flow displays source-linked relationships. The TypeScript compiler indexes local imports, declarations, calls and JSX relationships. IndexedDB holds imported snapshots, drafts, preferences and learning records on the user's device. A validated localStorage preference copy protects changes made immediately before reload.

Workers keep parsing and evaluation off the UI thread. Source analysis reuses unchanged parsed files and dependency-unaffected declaration/call indexes from its latest snapshot. Compiler binding and state/API relationships are rebuilt; globals and truncated facts conservatively force full reanalysis. Evaluation remains disposable. QuickJS runs imported code with memory limits and deadlines, without a bridge to host files or networking. Initial preview uses React server rendering. Interactive preview keeps a React reconciler alive inside QuickJS. Both display sanitized HTML in an opaque-origin iframe. A nonced trusted UI bridge forwards bounded events; imported code runs only in QuickJS. The frame cannot access app storage or fetch project-supplied resources.

Local development preserves QuickJS binary URLs and prepares worker-only parsers before the first preview. Separate browser checks cover development-mode grading and interactive rendering. Source graph nodes keep their measurements across draft and result updates, and diagrams refit after panel or viewport resizing.

The same-origin Vercel Node gateway now handles bounded database feedback/activity and protected account/admin routes. Supabase provides GitHub sign-in and owner-scoped cloud copies. Migration 007 and Production-only server settings were applied with owner approval. The private GitHub App and live authenticated administrator checks remain separate. The older Sites version 17 remains unchanged.

There is no paid model adapter or background source upload. The source archive excludes credentials, dependencies, local operational data and Git metadata. Imported projects are never installed or modified in their original locations.

## Source learning and correctness

Public GitHub import pins a source revision. Folder and ZIP imports validate supported files. Limits are 200 source files, 128 KiB per file, 2 MiB total accepted source and 5 MiB compressed ZIP. Path traversal, duplicate paths, suspicious archives and unsupported formats are rejected within the implemented checks.

Roadmaps use learner preferences and actual dependency evidence. Walkthroughs explain source syntax, including arithmetic, comparisons and conditionals. Glossaries, quizzes, predictions and interview reflections support learning without a model. Static facts do not prove business intent or observed runtime behavior. State hooks are resolved through React imports, including aliases, rather than inferred from a matching function name alone.

| Exercise | Supported verification |
| --- | --- |
| Function rewrite and refactor | Type checking and at most 64 reference-derived input probes |
| Missing code and bug fixing | Bounded challenges validated against the reference |
| Feature mission | Supported numeric changed-output contract |
| Component reconstruction | Actual isolated initial DOM across up to six primitive-prop samples |
| Prediction and concept checks | Finite reference outputs and source-grounded questions |
| Interview reflection | Saved learner text without automatic grading claims |

Function probes independently vary supported parameters within 64 finite samples. Object key order does not matter; missing fields, undefined, null and nonfinite numbers remain distinct. Unsupported outputs cannot pass through lossy JSON conversion. Exceptions are excluded and counted. Passing samples does not establish general equivalence.

Contracts allow up to three typed scalar, literal-union, nullable, optional/default, scalar-array, small-tuple or small-object parameters. Objects allow two levels, three scalar leaves and 16 samples, including independent variations. Named aliases, interfaces and unambiguous inherited fields resolve through local imports and reexports. Read-only definitions retain original type names and readonly fields.

Generic aliases and interfaces allow up to three parameters with concrete arguments or bounded defaults. The new GitHub batch also supports independent scalar constraints, including bounded literal unions; defaults and arguments must satisfy the declared domain. Imported bounds and read-only definitions are retained. Generic functions, dependent/object bounds, unresolved constrained wrappers, conditional/mapped types and recursive or oversized shapes remain unsupported. Analysis version 10 refreshes stored indexes. Component checks cover only initial DOM across six primitive-prop samples.

Async grading settles native QuickJS promises with at most 1,000 microtask jobs and 75 ms, 8 MiB and stack limits per probe. Promise chains and homogeneous Promise.all work in the limited type environment. Timers, network and external dependencies remain unavailable. Pending reference promises are unsupported; rejected inputs count as excluded exception coverage. Checks compare settled values, not event-loop ordering.

The API index matches literal root-relative fetch requests with declaration-resolved Express routes by exact method and path. Links are candidates, without origin, mount, middleware or runtime-delivery proof. Ambiguous methods and shadowed/fake imports are excluded. Limits are 200 sites, 200 links and 60 graph nodes. Source links open a declaration or highlighted excerpt. Imported requests are never sent.

## Interactive preview and interface

If the application script fails to load, a static message provides a reload link and no-JavaScript guidance. The workspace combines source or live preview, technical-flow diagrams, lessons and Monaco practice. Users can resize panels, inspect supported rendered elements, navigate to their JSX source and view practice edits. Failed renders preserve the last successful output. Source or props changes require a fresh interactive session.

Synchronous click, input, change and submit handlers run inside QuickJS. React state, reducers and synchronous effects persist across at most 200 interactions, with 100 mapped function entries per action. Plain local CSS and default CSS module imports support bounded layout, variables, explicit & nesting to four combined rule/media levels through an allowlist; omissions are reported and resource loading is blocked. Sessions reuse sanitized CSS while rechecking loaded paths and bounds. DOM references, timers, asynchronous handlers, arbitrary packages, CSS module composition/global selectors, named/namespace CSS imports, implicit nesting, animations and full browser semantics remain unsupported.

Observed state reads show bounded values from directly imported React useState/useReducer calls, with source links and a 100-read limit per action. They are render-order observations, not an instance inventory or before/after diff; getters and toJSON are not invoked. A separate static list and diagram link state bindings to reads, updaters, initializers and props. Const chains preserve intermediate source links across two steps in one function; calls, properties, mutation and closures are excluded. Limits are 200 candidate bindings, eight paths per binding, 200 indexed relations and 60 diagrammed. These lexical references do not prove computed values or award mastery.

### Appearance and Coding Pet

Fifteen palettes coordinate workspace colors, Monaco and graphs. Optional device-theme following responds to light/dark changes and retains the manual palette. Browser checks cover every palette and imported-preview independence. Distinct original Boy, Girl and Robot characters support hair, clothing, body color, cap, glasses, background, size, position and hiding. Preferences persist locally.

The Coding Pet reacts silently to practice and completed supported checks, celebrates milestones and greets on click. It does not tutor, chat, explain code, speak or listen. Original CSS transitions and Motion animations provide short entrance and reaction effects. OS and app reduced-motion preferences are respected. Dialogs trap keyboard focus, close on Escape when permitted and restore focus to their opener. Automated accessibility checks supplement, but do not replace, manual review.

## Persistence and community privacy

The browser holds at most 25 projects. Source snapshots remain immutable while practice drafts and learning records are saved separately. Function mastery counts only function completions; component initial-render checks are displayed separately. XP and achievements are motivational local records, not trusted credentials.

Learning-only version 1 JSON export excludes source, drafts, notes, diagnostic free text, identity and credentials. Import checks the actual source hash, rejects a different revision and merges attempts and completions without duplicating XP or overwriting local drafts. Full-project backups are separately labelled because they include source and work in progress.

Cloud restore validates all incoming records, merges identical snapshots and keeps changed-source conflicts as separate copies. An atomic IndexedDB transaction rejects concurrent local changes, oversized projects or capacity violations before committing the batch. Local transaction tests and approved single-account Supabase upload/restore/delete/preferences checks passed. Real two-account isolation remains deferred because the owner has no second account available.

### Feedback and anonymous activity

The gateway accepts bounded bug, feature and general feedback with optional rating/contact. Production uses server-only database functions with a 1,000-feedback-row cap and 90-day opportunistic expiry. The local file store remains available for one local process only; it is not used on Vercel. Retry identifiers prevent duplicate feedback and reject changed content under an accepted identifier.

Activity collection is off by default. Explicit consent creates a random browser identifier; the gateway stores its hash and day-only first and last activity. It receives no source, paths or answers. Inactive records expire after 30 days. Revocation deletes activity and retains a hashed rejection marker for 30 days so delayed requests cannot recreate it. A full marker store pauses collection. Offline deletion retries when Preferences opens online.

The local submit/admin/opt-in/revoke journey passed browser checks. Approved live synthetic requests verified feedback acceptance, identical retry, changed-content rejection, activity recording, revocation and delayed-retry rejection. SQL confirmed the resulting records, then verified zero remaining after owner-approved cleanup. Activity and revocation markers share a 10,000-row cap; expiry is opportunistic rather than scheduled. Authenticated live admin acceptance is pending. GitHub issue drafts remain a user-submitted public fallback.

## Authentication and security

Supabase migrations 001–007 are applied and catalog-verified: ten RLS tables and thirteen privileged functions. GitHub login/logout/relogin and approved cloud sample checks passed. Google and manual linking remain disabled. Email recovery, TOTP, global-session behavior, disposable-account deletion and real cross-account isolation still need acceptance. The hosted deletion capability is configured; this is not evidence of deleting an actual account. Historical AI quota tables remain inactive.

GitHub App access uses selected repositories, shared single-use PKCE state, encrypted access/refresh tokens and leased rotation. Conditional writes prevent late callbacks/refreshes from undoing disconnect or reconnection. Local SQL tests cover these paths, but the test engine has one connection; private GitHub lifecycle, real cross-account isolation, multi-connection locks and remaining provider/MFA acceptance remain pending. Per-device session inventory is unfinished.

| Boundary | Implemented control |
| --- | --- |
| Import | Source allowlist, path validation, archive and size bounds |
| Execution | Separate VM, no host bridge, memory and time limits |
| Display | HTML sanitization, opaque frame, restricted event bridge, source validation |
| Gateway | Origin, method, schema, request and concurrency controls |
| Identity | Server-side bearer checks and owner-scoped policies |
| Administration | Local loopback token or configured role and MFA checks |

Repository text remains untrusted input even if it contains instructions. Supported code executes only in the bounded preview or evaluation runtime. Tests cover selected failure modes; they do not prove immunity from every browser, dependency or VM vulnerability.

Before production-readiness claims, complete independent security and upload review, live cross-account isolation checks, retention and deletion acceptance, backup drills, representative load tests and manual accessibility review. Final operator support contacts and policy details are still required.

## Verification and release procedure

The new scalar-constraint batch passed 368 unit/integration tests across 42 files, its final production build and one focused Edge import/practice/grading/reload journey. The preceding hosted backend passed all 36 local Edge journeys. Deployed commit 5d58fcf passed GitHub run 40322121312 with 353 tests, 36 Chromium journeys, five development journeys, audit zero, source scan and isolated native package checks. Commit c02a3d3 failed 16 WebKit journeys; the f5bf22b correction passed all checks in run 40552164083.

Nested-object checks cover optional containers, missing versus undefined leaves, readonly named contracts and rejection of oversized domains. Support links now open the public repository and issues.

The latest local unit receipt records {{UNIT_TESTS}} passing tests. The latest Edge receipt records {{BROWSER_TESTS}} passing journeys; all 37 WebKit journeys also passed locally. Coverage includes editor input, opaque preview isolation and keyboard focus. WebKit now launches locally with normal browser-file access. The new preview isolation test passes, including blocked parent/storage access, injected scripts and networking. The real-HTTP strict-CSP fixture passes in both engines. Linux CI also passed both browser suites and five development journeys; failed receipts are retained.

Earlier failed runs remain available: restricted temporary-file loading failures, Windows worker crashes and two superseded assertions that treated now-supported constraints as unsupported. Updated assertions continue to reject invalid constraints. No failure is counted as a pass. Bundle-size and upstream annotation warnings remain in production builds.

Two GitHub runs on 15 October found preference loss when reloading immediately after a theme choice. Preferences now save a validated synchronous browser copy before the database transaction. Five regression tests and a browser check with database writes prevented cover the fix. GitHub run 38692161774 passed on commit f951441e41257d73a442f6aee97adfbd777e436a, including all 22 browser journeys. The original failing assertion remains unchanged.

### Reproduce locally

- Use Node.js 24 and run npm ci --ignore-scripts.
- Run npm test -- --maxWorkers=1 on this Windows host, then npm run build.
- Start npm run preview -- --port 5181 --strictPort.
- Set TEST_URL to http://127.0.0.1:5181 and LOCAL_COMMUNITY_E2E to true, then run npx playwright test.
- The community journey creates disposable local data on port 8788 and refuses public targets. Do not send test feedback to production.

Local checks use Edge. GitHub runs Chromium and the newly added WebKit suite with disposable local fixtures; it also checks the development runtime. No public feedback is submitted by these automated suites.

The dependency audit reports known published issues, not a complete security assessment. Source scanning remains heuristic. Earlier failures and retries remain in the journal with separate receipts.

Batch changes locally as requested by the owner. Publish reviewed files through tmp/github-v10 and verify GitHub CI. Never push or reset the separate dirty root Sites history. Vercel automatic Git deployments remain disabled. Deploy only a reviewed batch, then verify APIs and the downloaded source archive. Neither c02a3d3 nor f5bf22b was deployed. Public repository: https://github.com/abhiram0411/RepoRecode.

The workspace provides a keyboard skip link, focus movement after page changes, active page and mode labels, named source/practice editors and focus restoration when profile options close. Automated accessibility checks cover the roadmap, source study and practice editor, alongside keyboard regressions. Full manual screen-reader acceptance remains pending.

## Operating costs and next work

Core learning uses local computation and storage, without a paid API or lesson quota. Production uses the existing Vercel Hobby and Supabase Free projects. Optional services must be genuinely free with no payment method, paid upgrade, automatic top-up or overage path. If that cannot be established, leave the integration disabled. No paid fallback is authorized.

Local feedback requires only the optional local Node gateway and a private data file. Follow docs/SERVICE_SETUP.md to configure APP_ORIGIN, COMMUNITY_STORAGE_PATH and a locally generated LOCAL_ADMIN_TOKEN. Never paste secret keys in chat or put private service keys in browser-prefixed environment variables. External alerts stay disabled until a free, bounded setup is verified.

### Remaining engineering and acceptance

- Verify authenticated live administration, real PostgreSQL concurrency and service limits under representative load. The free durable feedback/activity backend is implemented and live-tested.
- Complete remaining recovery/MFA/session/disposable-account tests, owner-deferred two-account isolation and the separate private GitHub App setup. Never delete the owner account for testing.
- Keep subsequent source releases synchronized to GitHub and verify their CI. The initial public source and hosted CI are complete.
- Broaden remaining practice shapes and generic functions, persistent indexing, indirect state/data relationships and preview dependencies/frameworks while preserving limits and evidence labels. Concrete generic contracts, local async settling, dependency-aware semantic reuse and literal API candidates are implemented.
- Verify Docker execution, low-end performance, real Safari devices, manual accessibility, independent security and operator response procedures.

Optional local Ollama may improve explanations in the learning workspace. It remains unimplemented, is not required for core learning and must not turn the Coding Pet into a tutor. Device-theme following is implemented.

This report records the current development release. Keep docs/RESUME.md current with exact tests, failures, publication status and next actions. The full master specification remains open until each required behavior has implementation and acceptance evidence.
