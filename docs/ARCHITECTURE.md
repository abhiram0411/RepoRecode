# Architecture and database

October 13 update: see RESUME.md for the current architecture delta. Provider-request code and tutor/voice UI were removed; the legacy AI routes return 410. Learning explanations are deterministic AST syntax descriptions in the workspace. Coding Pet is reactions-only. Local feedback/activity use the optional single-process server/community.mjs store; no public Node backend is configured. Old AI quota tables described below are compatibility history, not an active service.

## Browser workspace

The React SPA owns navigation, source study, Monaco editing, a static relationship graph and accessibility. Source import accepts a narrow source allowlist and bounded archives. A reusable worker builds a virtual TypeScript compiler host. It caches only the most recent source snapshot, compares exact content and reparses changed/new files. Every request rebuilds semantic relationships, so unchanged importers resolve changed exports, missing files and new path candidates correctly. Graph references use one traversal per file and direct declaration lookup. The cache is cleared on worker failure, a 20-second parent deadline, project deletion or application unmount; overlapping requests are rejected. No compiler cache is persisted. Identical snapshot hashes resume existing progress before analysis; changed snapshots remain separate projects. AST declarations carry exact offsets and line ranges. Compiler symbol resolution supplies local call and JSX component edges; unresolved and dynamic relationships are omitted.

The index also records syntactic variables, state hook calls, HTTP calls, error handling, tests and entry points. Router, database and authentication candidates remain explicitly uncertain. These facts are not runtime traces.

The state relationship index resolves const tuple bindings from imported React useState/useReducer declarations through the compiler checker. It links direct reads, updater calls, initializer references and JSX prop references back to the originating hook. Bounded provenance also follows two const initializer steps in the same function, preserving intermediate source locations. It considers at most 200 candidate bindings and eight distinct paths per binding; expressions are bounded to 128 nodes/depth 12. Calls, property access, mutation, closures, shadowed names, type-only references and non-React hooks are excluded from propagation. These are lexical dependencies, not computed values, callback delivery or execution order. The list caps at 200 distinct relationships with an omitted count; the diagram displays the first 60. Analysis version 6 triggers safe refresh for older snapshots.

Roadmaps follow actual call dependencies and adapt wording to experience and goals. Source explanations, hints, quizzes and companion responses are deterministic and derive from indexed source facts, selected symbols, diagnostics and evaluation results. No external AI provider is required and no AI output grants mastery.

## Evaluation and preview

A supported function passes a limited type environment before transpilation. The original and candidate execute in fresh QuickJS runtimes for each bounded probe. Sampling varies every parameter before filling the 64-case budget. References run twice; observed instability or unsupported output makes grading unavailable. Failed reference inputs are excluded and counted visibly; exception behavior is not graded. Typed output keys distinguish missing/undefined/null and nonfinite values, preserve array order and ignore plain-object field insertion order. Callable/cyclic outputs are rejected. Zero valid reference probes cannot pass. Mutated debugging and missing-code challenges require a passing reference and failing mutation.

Feature missions transform each finite numeric reference output by a stated rule. They record separate completion and do not incorrectly mark the original contract complete. Independent missions unlock after passing the original function. Interviews save self-explanations without an automatic correctness claim.

React preview offers initial SSR and a persistent interactive reconciler inside QuickJS. Source JSX receives file and line attributes. A source patch handles exported function and arrow declarations without modifying imported files, and maps shifted lines back to the original snapshot. parse5 rebuilds output through tag, attribute and style allowlists. A script-disabled iframe displays sanitized HTML. Parent inspection validates locations against the source index.

Plain CSS files are included within the source import limits. The VM records side-effect stylesheet imports in execution order; only those imported paths are accepted. CSS-tree reconstructs allowed selectors, declarations, explicit & nested selectors and media blocks up to four combined levels. Declaration order is preserved without expanding selector combinations. URL/raw nodes, arbitrary functions, external imports/fonts, pseudo-elements, implicit nesting/raw parser recovery and animation constructs are omitted. Variables cannot carry URL nodes; generated CSS escapes HTML closing delimiters. Inline styles use the same declaration allowlist. Loaded CSS is capped at 256 KiB, each stylesheet at 128 KiB, 20,000 AST nodes, 1,000 rules and 3,000 declarations. Parser work stays in disposable workers with parent deadlines. CSS modules and bound CSS imports fail explicitly. Styling is display-only and does not become visual-equivalence grading.

Interactive sessions use a VM-local scheduler, React 19.3.0 and reconciler 0.34.0, pinned for compatibility. Parent-side input/click/change/submit listeners send plain bounded event data to a serialized worker protocol. Each session has a 48 MiB heap, 1 MiB stack, 1.5-second mount and 750-ms action deadline, plus parent deadlines (15 seconds mount/5 seconds action). Queues stop at 20 pending actions; sessions stop at 200 interactions. Source/props changes or unmount terminate the worker. Errors preserve the last good HTML and require a new render. Form submission runs in the VM without enabling forms or scripts in the iframe. DOM refs, browser APIs, timers and asynchronous handlers remain unsupported.

The TypeScript transform also records imported function entries, preserving directive prologues and expression-arrow returns. Traces keep 100 calls per render/action with an omitted count; locations are checked against original source bounds before display and linked to the narrowest indexed symbol. Event history keeps the latest 20 deliveries and whether sanitized HTML changed. This untrusted local observation is for learning, never authorization or mastery; arbitrary imported code can interfere with its own execution and observations.

Resolved direct React useState/useReducer imports receive a transparent return-value observer. Aliases and namespace/default imports are supported; shadowed names are excluded. Up to 100 state reads per action retain render order with bounded local value summaries. Inspection avoids getters and toJSON, with all work inside VM limits. There is no instance identity, final inventory, before/after diff, full call stack or network trace.

## Device storage

IndexedDB reporecode version 1 has projects keyed by UUID and settings keyed by preferences. Project records contain files, index, lessons, attempts, drafts, completed symbols, prediction evidence, feature missions and interview notes. Maximum 25 projects, bounded source and payload size. Drafts debounce after edits. Backups rebuild the source index and discard invalid symbol references. Preferences also use a validated synchronous localStorage copy so immediate reload cannot interrupt the ordinary IndexedDB save. Invalid/unavailable copies fall back to IndexedDB. No AI lesson payload or provider request is required.

Analysis versions allow older saved projects to refresh derived symbols/lessons without replacing source or learning data. The transaction rereads the latest project, rejects deletion or changed source, and preserves concurrent drafts/notes. Function probes support scalar unions, nullable/optional/default values, scalar arrays, small fixed tuples and inline objects while preserving undefined/omitted distinctions. Objects allow three scalar fields and 16 samples; number/string fields use four representative values and other scalar unions must fit four choices. Omitted fields and own undefined properties are distinct; computed literal encoding handles quoted and __proto__ keys without prototype mutation. Methods, computed declarations, index signatures, nested shapes and wider unions are rejected. Typed prediction keys retain the same distinctions; compound outputs that cannot be faithfully entered as JSON are excluded. Optional device-theme following subscribes to media changes without writing a preference on every OS change; choosing a manual palette disables following.

A SHA256 of canonical sorted source detects identical snapshots. Offsets are stable within a snapshot, not across code versions. New source versions have independent progress. Explicit cloud restoration merges identical snapshots without replacing local drafts/notes and keeps changed-source conflicts as separate copies. Atomic IndexedDB writes detect concurrent changes and reject the whole batch on failure. Live provider acceptance is pending; there is no automatic background sync.

## PostgreSQL schema

Apply migrations 001–006 in order to Supabase. All six execute in local PGlite PostgreSQL tests, including owner isolation, payload constraints and account-deletion cascades. PGlite has one connection; this is not hosted Supabase or multi-connection lock acceptance.

| Relation | Purpose | Access |
| --- | --- | --- |
| projects | Immutable source snapshot plus learning payload | Owner RLS, bounded JSONB, owner/time index |
| github_connections | Encrypted GitHub user token and login | Service role only |
| github_oauth_pending | One hashed state per owner, encrypted PKCE verifier, consumed marker and expiry | Service role only |
| tutor_daily_quotas | Per-user/global daily reserved request counts | Service role RPC only |
| ai_usage | Provider model, recorded tokens, creation time | Service writes; owner can read own usage |
| preferences | Profile, theme, companion and learning settings | Owner RLS and bounded payload |

Owner foreign keys cascade on auth.users deletion. reserve_tutor_request locks the global row then the user row in one transaction and limits requests to 100 global and 20 per user per UTC day. admin_snapshot returns service-role-only aggregates of users, sign-ins, projects, connections and usage. Ordinary browser roles cannot invoke either privileged RPC.

## Gateway and operations

The Node gateway verifies bearer identity through Supabase, validates exact request origins, bounds schemas, and allows at most two concurrent protected operations. Provider endpoints come only from owner configuration. Shared quotas fail closed when configured accounting is unavailable. Text-only tutor output and structured lessons have no tools or execution authority.

GitHub App authorization uses shared one-time state and PKCE. Database transactions serialize begin/consume/complete/disconnect by owner; state is hashed, expires after ten minutes, and is superseded by a newer connection attempt. Access and refresh tokens are encrypted with AES256-GCM using a server-only key. Expiring access tokens rotate under a 60-second database lease; conditional updates compare previous ciphertext and lease identity, so disconnect/reconnection wins over stale refresh results. Waiting callers reread persisted credentials with a bounded retry budget. A crash after provider rotation but before storage may require reconnection. Access is limited by the user's and installed App's grants. Imports pin a commit and use fixed API endpoints with per-call and overall deadlines.

The admin API checks trusted app metadata and MFA assurance on every call. It reports actual process metrics and optional database aggregates. CPU, memory and billed cost are unavailable rather than invented. Alert delivery is disabled until explicit destinations are configured. Persistent state deduplicates active/recovery transitions. A separate hosted watchdog detects outages after three failures.

## Deployment and scaling boundaries

Static assets can be served by a CDN. Analysis and sandbox work consume each visitor's browser resources rather than arbitrary server processes. Cloud data is accessed through pooled Supabase APIs. GitHub state and token leases are shared in PostgreSQL; local feedback, process telemetry and request limits still target one gateway replica. Historical AI quota rows are inactive. No infrastructure spending is authorized.

There is no hosted queue for large imports, OS-level cloud execution sandbox, complete runtime flow collector, distributed incident store or infrastructure billing adapter. These are explicit remaining production work.

Interactive sessions snapshot CSS text and cache sanitized output per loaded file. Every collection still validates imported paths, source order and total size before use. Unloaded files are not parsed. Disposal clears the cache; another source snapshot never shares it. A static startup message and reload link remain readable if the application module does not load, with a separate no-JavaScript explanation.
