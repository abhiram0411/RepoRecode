# RepoRecode Engineering and Handover Report

Prepared for Abhiram on 15 October 2026

RepoRecode is a usable development release for learning from real JavaScript and TypeScript source. Its local learning workflow requires no account, database, model or payment method. This report describes implemented behavior, the recorded checks and the work still required by the master specification. It is not a claim of full product completion or an independent security assessment.

The owner approved MIT licensing and public publication. All spending remains prohibited, including paid plans, overages, payment methods and automatic top-ups. The Coding Pet is silent and reactions-only. Paid AI endpoints have been removed; optional local Ollama remains unimplemented.

| Evidence | Current record |
| --- | --- |
| Unit and integration checks | {{UNIT_TESTS}} tests passed |
| Local production browser journeys | {{BROWSER_TESTS}} passed; {{BROWSER_FAILURES}} failed |
| Latest confirmed public release | Version {{PUBLIC_VERSION}} |
| Source download | {{DOWNLOAD_STATUS}} |
| Dependency audit | {{VULNERABILITIES}} known vulnerabilities reported |
| External services | Supabase and GitHub App not configured or live verified |

Public website: https://reporecode-learning-lab.milkyibex8.chatgpt.site

The test records describe the checked local source. The deployment record identifies the latest confirmed public version. If the next release has not been published, these are different scopes. Exact current records are artifacts/deployment.json, source-download.json, unit-results.json and browser-results.json.

### How to resume development

Read docs/RESUME.md, docs/MASTER_SPEC.md, docs/FEATURES.md and docs/SERVICE_SETUP.md. Preserve the existing working tree. Complete the listed remaining work using evidence from the actual implementation. Do not revive the tutor or add billable infrastructure.

## Architecture and data boundaries

[architecture]

React and Vite provide the browser interface. Monaco supplies source editing and React Flow displays source-linked relationships. The TypeScript compiler indexes local imports, declarations, calls and JSX relationships. IndexedDB holds imported snapshots, drafts, preferences and learning records on the user's device. A validated localStorage preference copy protects changes made immediately before reload.

Workers keep parsing and evaluation off the UI thread. Source analysis reuses unchanged parsed files from its latest snapshot; semantic relationships are rebuilt. Evaluation remains disposable. QuickJS runs imported code with memory limits and deadlines, without a bridge to host files or networking. Initial preview uses React server rendering. Interactive preview keeps a React reconciler alive inside QuickJS. Both display sanitized HTML in a script-disabled iframe.

The optional Node gateway handles GitHub App access, protected administration and local feedback. Supabase can provide optional identity and owner-scoped cloud copies after owner setup and live acceptance. The public Sites deployment currently serves static frontend assets and does not run this gateway.

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

Function probes vary every supported parameter before filling the remaining combination budget. Object fields compare independently of insertion order. Missing fields, undefined, null and nonfinite numbers remain distinguishable. Callable, cyclic and other unsupported outputs cannot earn a false success through lossy JSON conversion. Excluded reference inputs are reported; exception behavior is not graded. Passing a finite sample does not establish general equivalence.

Function contracts support up to three explicitly typed scalar, literal-union, nullable, optional/default, scalar-array, small fixed-tuple or shallow inline-object parameters. Objects have up to three scalar fields, four base choices per field and 16 samples; nested shapes and wider unions remain unsupported. Generated inputs preserve omitted/undefined/null distinctions; prediction comparison also preserves types. Saved indexes refresh without replacing concurrent learning work. Component checks do not grade event handlers, later state, stylesheet appearance or full TypeScript correctness. Broader contracts remain unfinished.

## Interactive preview and interface

If the application script fails to load, a static message provides a reload link and no-JavaScript guidance. The workspace combines source or live preview, technical-flow diagrams, lessons and Monaco practice. Users can resize panels, inspect supported rendered elements, navigate to their JSX source and view practice edits. Failed renders preserve the last successful output. Source or props changes require a fresh interactive session.

Synchronous click, input, change and submit handlers run inside QuickJS. React state, reducers and synchronous effects persist across at most 200 interactions, with 100 mapped function entries per action. Plain local CSS imports support bounded layout, variables and media queries through an allowlist; omissions are reported and resource loading is blocked. Sessions reuse sanitized CSS while rechecking loaded paths and bounds. DOM references, timers, asynchronous handlers, arbitrary packages, CSS modules/nesting/animations and full browser semantics remain unsupported.

Observed state reads show bounded values from directly imported React useState/useReducer calls, with source links and a 100-read limit per action. They are render-order observations, not an instance inventory or before/after diff; getters and toJSON are not invoked. A separate static list and diagram link direct const state bindings to reads, updater calls, initializers and props, excluding shadowed names. Limits are 200 indexed relations and 60 diagrammed. Neither observations nor static references award mastery.

### Appearance and Coding Pet

Fifteen palettes coordinate workspace colors, Monaco and graphs. Optional device-theme following responds to light/dark changes and retains the manual palette. Browser checks cover every palette and imported-preview independence. Distinct original Boy, Girl and Robot characters support hair, clothing, body color, cap, glasses, background, size, position and hiding. Preferences persist locally.

The Coding Pet reacts silently to practice and completed supported checks, celebrates milestones and greets on click. It does not tutor, chat, explain code, speak or listen. Original CSS transitions and Motion animations provide short entrance and reaction effects. OS and app reduced-motion preferences are respected. Dialogs trap keyboard focus, close on Escape when permitted and restore focus to their opener. Automated accessibility checks supplement, but do not replace, manual review.

## Persistence and community privacy

The browser holds at most 25 projects. Source snapshots remain immutable while practice drafts and learning records are saved separately. Function mastery counts only function completions; component initial-render checks are displayed separately. XP and achievements are motivational local records, not trusted credentials.

Learning-only version 1 JSON export excludes source, drafts, notes, diagnostic free text, identity and credentials. Import checks the actual source hash, rejects a different revision and merges attempts and completions without duplicating XP or overwriting local drafts. Full-project backups are separately labelled because they include source and work in progress.

Cloud restore validates all incoming records, merges identical snapshots and keeps changed-source conflicts as separate copies. An atomic IndexedDB transaction rejects concurrent local changes, oversized projects or capacity violations before committing the batch. Local transaction tests pass; real Supabase acceptance remains pending.

### Feedback and anonymous activity

The optional local gateway accepts bounded bug, feature and general feedback with optional rating and contact. A protected local administrator can read measured counts and escaped feedback. The single-process file store caps feedback at 1,000 records and limits submissions. It must not be used as a shared multi-process database or exposed through static hosting.

Activity collection is off by default. Explicit consent creates a random browser identifier; the gateway stores its hash and day-only first and last activity. It receives no source, paths or answers. Inactive records expire after 30 days. Revocation deletes activity and retains a hashed rejection marker for 30 days so delayed requests cannot recreate it. A full marker store pauses collection. Offline deletion retries when Preferences opens online.

The local submit, admin, opt-in and revoke journey is browser-tested with disposable data. Public feedback remains unavailable because a durable same-origin backend with a hard zero-spend stop has not been configured. Installation counts are not people, downloads or GitHub clones; unavailable metrics remain unavailable.

## Authentication and security

Supabase integration prepares optional sign-in, linking, recovery, TOTP, session sign-out, account deletion and explicit cloud copies. Migrations 001–006 execute in local PostgreSQL tests, including owner isolation, payload limits and deletion cascades. Historical AI quota tables are inactive. Hosted provider acceptance remains pending.

GitHub App access uses selected repositories, shared single-use PKCE state, encrypted access/refresh tokens and leased rotation. Conditional writes prevent late callbacks/refreshes from undoing disconnect or reconnection. Local SQL tests cover these paths, but the test engine has one connection; live GitHub, hosted RLS, multi-connection locks, OAuth/MFA and private-repository acceptance remain pending. Per-device session inventory is unfinished.

| Boundary | Implemented control |
| --- | --- |
| Import | Source allowlist, path validation, archive and size bounds |
| Execution | Separate VM, no host bridge, memory and time limits |
| Display | HTML sanitization, script-disabled iframe, source validation |
| Gateway | Origin, method, schema, request and concurrency controls |
| Identity | Server-side bearer checks and owner-scoped policies |
| Administration | Local loopback token or configured role and MFA checks |

Repository text remains untrusted input even if it contains instructions. Supported code executes only in the bounded preview or evaluation runtime. Tests cover selected failure modes; they do not prove immunity from every browser, dependency or VM vulnerability.

Before production-readiness claims, complete independent security and upload review, live cross-account isolation checks, retention and deletion acceptance, backup drills, representative load tests and manual accessibility review. Final operator support contacts and policy details are still required.

## Verification and release procedure

Local evidence currently records {{UNIT_TESTS}} passing unit and integration tests and {{BROWSER_TESTS}} passing production-browser journeys. Coverage includes imports, practice corrections, component reconstruction, persisted progress transfer, themes, keyboard dialogs, state/form interaction, source navigation, restore transactions and local feedback privacy.

An early unrestricted Windows test run lost a worker process. Repeating with two workers passed; no failing test is concealed by that earlier crash. Browser accessibility also caught reduced text contrast during an entrance fade. The fade was removed while retaining movement. The final build and browser result files are the acceptance evidence.

Named-input support now follows simple aliases and non-inherited interfaces through relative imports/reexports, preserves original source names, supplies read-only definitions to the editor/compiler and retains omitted/undefined/readonly behavior. Expansion is bounded to depth 8, 256 nodes, 16 aliases and an 8 KiB context; existing three-parameter/64-probe and shallow-object limits remain. Generic/merged/inherited/recursive/namespace-qualified types and body-local type dependencies remain unsupported. Analysis version 4 offers saved-index refresh. New evidence: 18 named-input tests and the real import/rewrite/reload browser journey.

On 15 October, GitHub runs 38657450520 and 38683512075 both failed the immediate theme-reload assertion (expected light, received dark); all installation/unit/build/audit/scan steps passed. The initial success did not guarantee later runs. Preferences now write a validated synchronous localStorage copy before the asynchronous IndexedDB transaction and load that copy first. Invalid/blocked storage falls back to IndexedDB; quota failures remove stale copies when possible. Five regression tests cover persistence/fallback/validation/rapid saves, and a browser regression prevents the database write before immediate reload. Original failing assertions were retained. GitHub CI also now enables the disposable local community journey. These fixes need a new pushed CI result before claiming the notification issue resolved.

### Reproduce locally

- Use Node.js 24 and run npm ci --ignore-scripts.
- Run npm test -- --maxWorkers=2, then npm run build.
- Start npm run preview -- --port 5181 --strictPort.
- Set TEST_URL to http://127.0.0.1:5181 and LOCAL_COMMUNITY_E2E to true, then run npx playwright test.
- The community journey creates disposable local data on port 8788 and refuses public targets. Do not send test feedback to production.

Windows tests use Edge. The initial public GitHub commit passed its hosted CI, including Chromium browser checks (run 38586172832). The dependency audit reports known published issues, not a complete security assessment. The source scanner checks common secret patterns and remains heuristic.

Release through the existing public Sites project. Push the exact source, package the matching build, save its version and deploy that returned version. Verify deployment status and compare the public source ZIP hash with the local package. Preserve host receipts. The public MIT repository is https://github.com/abhiram0411/RepoRecode. Its separate release checkout is tmp/github-v10; preserve its history independently of Sites.

## Operating costs and next work

Core learning uses local computation and storage, without a paid API or lesson quota. Public hosting remains the existing static Sites installation. Optional services must be genuinely free with no payment method, paid upgrade, automatic top-up or overage path. If that cannot be established, leave the integration disabled. No paid fallback is authorized.

Local feedback requires only the optional local Node gateway and a private data file. Follow docs/SERVICE_SETUP.md to configure APP_ORIGIN, COMMUNITY_STORAGE_PATH and a locally generated LOCAL_ADMIN_TOKEN. Never paste secret keys in chat or put private service keys in browser-prefixed environment variables. External alerts stay disabled until a free, bounded setup is verified.

### Remaining engineering and acceptance

- Provide a genuinely free, durable public feedback backend with a hard spending stop, or retain truthful unavailability.
- Complete owner-configured Supabase, OAuth and GitHub App acceptance with real accounts and selected private repositories.
- Keep subsequent source releases synchronized to GitHub and verify their CI. The initial public source and hosted CI are complete.
- Expand practice contracts, incremental semantic indexing, state and data relationships, preview dependencies and framework support while preserving limits and evidence labels.
- Verify Docker execution, low-end performance, additional browsers, manual accessibility, independent security and operator response procedures.

Optional local Ollama may improve explanations in the learning workspace. It remains unimplemented, is not required for core learning and must not turn the Coding Pet into a tutor. Device-theme following is implemented.

This report is a development checkpoint. Keep docs/RESUME.md current with exact tests, failures, publication status and next actions. The full master specification remains open until each required behavior has implementation and acceptance evidence.
