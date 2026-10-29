# Changelog

## 30 October 2026 — saved analysis reuse

- New analysis workers can restore compatible declaration/fact/call indexes from existing saved projects after reload; dependency changes still invalidate affected files.
- Invalid, outdated or oversized saved indexes fall back to fresh analysis. Compiler objects are recreated, and all state/API relationships are checked again.
- Added reload/import and saved-index validation tests. No second source database, cloud field, paid service or production deployment.

## 29 October 2026 — learning and local-source refresh

- Added bounded scalar/object and earlier-parameter generic-function practice, preserving original type constraints and rejecting invalid defaults.
- Added static property state links and constant-string API path candidates without executing imported code.
- Added read-only session-local folder linking, visible-tab polling and explicit changed-snapshot imports that retain earlier projects.
- Added disposable Docker database concurrency and app-container acceptance runners; removed the temporary native PostgreSQL runtime.
- Source batch only; Vercel remains on the existing reviewed deployment. Native directory-picker permission acceptance and other documented live/manual checks remain outstanding.

26 October routing correction: 17e0431 passed CI and deployment 49FihMjN2muKoiDnLyr9iKu2ptM1 reached Ready. The missing-module problem is fixed and the public source ZIP/security headers pass, but health/status return JSON 404 because their checks matched the entire rewritten URL instead of its path. Corrected those checks and exercised query metadata in the isolated-package smoke; that smoke and all 24 focused gateway/database tests pass. Live backend acceptance remains incomplete pending this correction.

26 October hosted deployment correction: 261eca4 passed GitHub run 40228562623, then Vercel deployment 8CtRBsTnifq8sEHnEBZqoh1Af79q reached Ready. All six targeted live guest journeys passed, but the API returned 500 due to missing src/core/import.ts in the function package. Added an explicit Vercel include and a smoke check from a separate package tree. Native Node 24 isolated smoke passed. Preserve the startup failure; do not treat Ready as backend acceptance. Migration 007 and Production-only settings are applied with owner approval; no migration rerun is needed. Replacement deployment and live API proof remain pending.

## 26 October 2026 — prepared hosted backend

- Added a shared Node request handler and one Vercel API entry with default-off server configuration. Hosted mode cannot use the local feedback file, loopback administration or background alert timers.
- Prepared migration 007 for bounded server-only community storage, shared admission limits, feedback idempotency and durable activity revocation. Cleanup is opportunistic: feedback 90 days; inactive activity/revocation markers 30 days. This migration has not been applied to production.
- Added strict feedback/activity confirmation and retry identifiers. Local SQL/HTTP tests and a native Node entry smoke test cover configuration failures, limits, permission denial, privacy bounds and routing. Real Vercel/Supabase and independent-connection acceptance remain pending.

## 25 October 2026 — deployment acceptance and provider availability

- Patched Zod to exactly 4.6.6 after GitHub's audit detected GHSA-mrhx-c7xc-m3w5. Security gate remains unchanged; local audit is clear.
- Account deletion stays disabled until a same-origin gateway advertises configured deletion support. Missing APIs, expired sessions and malformed success responses produce clear failures; no automatic deletion or retry occurs. This does not provide a hosted deletion backend.
- GitHub batch d826327 passed CI and is live on Vercel Hobby. Supabase Free/GitHub login, callback, sign-out/relogin, sample cloud save/restore/delete and preferences passed focused live acceptance. Full master-spec and two-account acceptance remain incomplete.
- The next frontend batch lists only enabled Supabase Auth providers, handles settings failures with retry, gates manual identity changes explicitly and accepts existing passwords without imposing the new-password length minimum. Tested locally against the real public provider settings; not yet redeployed.

The older entries below describe status at the time of each change. Their reviewed feature batch was subsequently published in d826327.

## Local follow-up 23 October 2026

- Practice resolves bounded default generic arguments, including imported/inherited definitions and defaults referring to earlier parameters. Original readonly/default context remains visible. Invalid/cyclic/constrained or oversized definitions stay unsupported. Analysis version 9 refreshes existing indexes.


## Local batch — API paths and responsive source navigation

Added bounded fetch/Express method-path candidate lists and graphs, exact source excerpts for top-level declarations, graph fitting after panel/viewport resizing and mobile panels that expand with their content. These changes remain local with the generic/async practice, semantic reuse and keyboard improvements. Version 17 stays live; no deployment is part of this batch.

## 16 October 2026 — Broader practice and incremental indexes (local batch)

- Added concrete generic aliases/interfaces and instantiated bases while retaining input bounds and readonly checks.
- Added bounded async/await and native promise result grading, including pending-job and time limits.
- Reuse unaffected declaration/call indexes; invalidate through changed imports/reexports, with conservative global/truncation fallback.
- Added real-browser generic async practice and unaffected-index reuse coverage; Firefox verification is in progress.

## 16 October 2026 — Keyboard workspace access

- Added keyboard navigation bypass, page-change focus, profile Escape focus restoration, active page/mode semantics and distinct source/practice editor labels.
- Expanded automated accessibility coverage to the learning path, source study and practice editor, with keyboard-only navigation regressions.
- Corrected the unsupported-practice explanation to distinguish ambiguous inheritance from supported small inherited interfaces.

## 16 October 2026 — CSS Modules preview

- Default local .module.css imports now expose bounded scoped class/ID names, including explicit nested selectors and interactive state updates.
- Unsafe resources, unsupported module constructs and oversized export maps remain blocked or reported; unrelated unimported module errors do not prevent another entry from rendering.
- Added focused unit coverage and a browser journey for independent same-name styles, nesting, interaction and resource isolation.

## Bounded inherited practice contracts — 16 October 2026

Practice now resolves small interface inheritance trees, including renamed imports/reexports, multiple distinct bases, optional and readonly inherited fields. Duplicate/overridden fields, diamond duplicates, cycles, merged declarations, generic/qualified/non-interface bases and oversized/deep shapes remain unsupported. Existing bounds remain: depth 8, 256 expansion visits, three properties per object, two object levels/three leaves, 16 object samples and 64 probes. Analysis version 7 refreshes old indexes.

## Explicit nested preview styles — 16 October 2026

Safe local styles retain explicit & nested selectors and nested media declarations, preserving source order up to four combined rule/media levels. All existing resource/value restrictions and total budgets apply at every depth. Implicit nesting/raw parser recovery remains omitted with notices. CSS is displayed using native browser nesting; no selector-product expansion or visual-equivalence grading is introduced.

## Bounded state initializer chains — 15 October 2026

State relationships can trace two const-initializer steps within one function, show intermediate source links and show numbered graph arrows with readable relationship details and source controls. The analysis excludes calls, property access, mutable bindings and closures; it records lexical references rather than evaluated data flow. Bounds are 200 candidate bindings, eight paths per binding and the existing 200 relationship/60 graph-edge limits. Analysis version 6 enables old-index refresh. Verification and publication are tracked in RESUME.md.

## Public feedback without a hosted gateway — 15 October 2026

Preferences offers reviewable GitHub issue drafts when anonymous feedback delivery is unavailable. Only entered category/message is shared on opening the draft; the visitor submits it on GitHub. Public visibility and account requirements are explicit. Long encoded messages use full-text copy/paste, with a manual fallback when clipboard access is denied. Feedback and activity availability now use their separate service flags; the status request has an eight-second deadline. No server, secret, paid service or automatic issue submission was added.

## Nested object practice and public support — 15 October 2026

Practice now accepts two object levels with three scalar leaves across the whole parameter, including nested named aliases/interfaces and optional containers. Missing fields and explicit undefined remain distinct at both levels. Independent field variations must fit within 16 object samples; wider shapes are rejected instead of silently losing coverage. The existing three-parameter/64-probe cap remains. Analysis version 5 enables saved-index refresh. The footer and Support dialog now link to the public GitHub repository and issues.

## Named input types and immediate-reload preferences — 15 October 2026

Named-input support now follows simple aliases and non-inherited interfaces through relative imports/reexports, preserves original source names, supplies read-only definitions to the editor/compiler and retains omitted/undefined/readonly behavior. Expansion is bounded to depth 8, 256 nodes, 16 aliases and an 8 KiB context; existing three-parameter/64-probe and shallow-object limits remain. Generic/merged/inherited/recursive/namespace-qualified types and body-local type dependencies remain unsupported. Analysis version 4 offers saved-index refresh. New evidence: 18 named-input tests and the real import/rewrite/reload browser journey.

Fixed preference loss when a page reloads before IndexedDB commits. Validated preferences now save synchronously as well, with safe database fallback. Added regression coverage rather than weakening the existing reload check. The initial public GitHub source is published; subsequent failed CI theme checks are preserved in the journal.


## Startup recovery and stylesheet reuse — 14 October 2026

A readable loading/reload message replaces the empty startup screen when app scripts fail; no-JavaScript guidance is included. Interactive previews reuse sanitized styles per immutable session while validating paths, order and aggregate limits on each action. Cache disposal and changed snapshots are tested.

## Inline object practice — 14 October 2026

Added bounded inline object inputs with up to three scalar fields and 16 object samples. Optional/readonly fields, quoted keys, own __proto__ fields and missing/undefined/null distinctions are checked in the isolated grading runtime. Every supported field varies within the three-parameter / 64-probe budget. Nested shapes, methods, index signatures, named types and wide property unions remain unsupported. Analysis version 3 refreshes older indexes.

## Source-resolved state relationships — 14 October 2026

Added a source-linked list and diagram for direct React state reads, setter/dispatch calls, initializer references and JSX props. Compiler declaration identities distinguish aliases of React imports, shadowed locals and separate component bindings. This is bounded static evidence, not runtime ordering, indirect propagation or proof of a computed value. Analysis version 2 enables saved-project refresh; up to 200 relationships are indexed and 60 shown in the diagram.

## GitHub lifecycle, imported CSS and device themes — 14 October 2026

Added shared, single-use database OAuth state and encrypted refresh-token rotation with leases and conditional writes that preserve disconnect/reconnect decisions. Migration 006 is required. Added local PostgreSQL execution of all migrations, owner-isolation checks and callback/refresh race tests; live provider acceptance remains pending. Plain local CSS imports now render through a bounded allowlist in both React previews, with omitted-style notices and blocked resource loading. Added optional light/dark device-theme following that preserves a manual palette choice.

## Expanded practice and safe saved-index refresh — 14 October 2026

Added scalar literal unions, null/undefined, optional/default arguments, boolean/readonly scalar arrays and fixed tuples within the three-parameter / 64-probe limit. Input encoding preserves missing, undefined and null; generated stubs retain optional markers and defaults. Saved projects can refresh analysis atomically while retaining their newest learning work. Prediction comparison now preserves types and array order, accepts equivalent reordered object fields and top-level non-JSON values, and excludes compound outputs that cannot be entered faithfully.

## Incremental source parsing — 13 October 2026

Consecutive imports reuse exact unchanged source trees in one worker, keeping only the latest snapshot. Identical snapshots resume saved progress before analysis; changed snapshots remain separate. Semantic relationships are checked afresh, including changed exports, removed files and newly available import targets. Graph references now use one traversal per file and direct declaration lookup. Worker deadlines, failure recovery and deletion cleanup are retained. State concept labels resolve React aliases and exclude shadowed locals; component study text now describes the available initial-render checks.

## State observation and grading corrections — 13 October 2026

Added source-linked React state reads in interactive preview, with resolved import aliases, local summaries and bounded observation counts. Static state facts now exclude shadowed or unrelated same-named functions. Added reduced-motion-aware page, roadmap and result transitions, and verified preview color independence.

Corrected three-parameter probe sampling so early parameters vary within the 64-input budget. Typed output comparison accepts reordered plain-object fields while distinguishing missing, undefined, null and nonfinite values; unsupported callable/cyclic outputs cannot silently pass. Reference exclusions are visible. Component completions no longer inflate function mastery; project cards include component candidates. Refreshed the free-only engineering report.

## Free-only learning and restoration milestone — 13 October 2026

Added 15 coordinated themes, richer original characters, reduced-motion-aware animation, reaction-only Coding Pet, learning-only progress transfer, and bounded AST expression walkthroughs. Removed paid model calls and all tutor/voice UI. Added component reconstruction using real isolated initial-render comparisons with explicit finite coverage. Added non-destructive cloud restore planning, atomic IndexedDB saves and concurrent-edit rejection. Added keyboard-trapped dialogs with opener focus restoration.

Optional local feedback/admin and opt-in activity now have browser coverage; revocation tombstones prevent delayed requests recreating deleted activity. Public static hosting has no feedback backend. Supabase/OAuth/private GitHub still need owner configuration and live acceptance. Historical tutor/speech features below were superseded by this milestone.

## Interactive preview milestone — 12 October 2026

Added an optional isolated interactive React preview with persistent state, reducers, synchronous effects and controlled forms. Serialized events, execution limits, worker cancellation and preserved last-good output support recovery. Added a bounded source-linked function-entry timeline and observed event/output history. React/reconciler versions are pinned together. Full DOM, async, dependencies, styles and state/data/network tracing remain incomplete.

## 0.1.0 development release

Added bounded source imports and compiler index; exact references and static graphs; personalized lessons; rewrite, missing-code, bug-fix, refactor, prediction, concept, feature and interview practice; real initial React snapshots and source inspection; Monaco workspace, saved drafts, backups, XP and achievements.

Added original customizable avatars/companion, themes, speech controls and optional dictation. Added optional Supabase account lifecycle and preference/project sync, GitHub App integration, structured AI lessons, shared quotas, admin metrics and operational alerts. External services remain unconfigured and unverified.

Prepared MIT license, installation/API/security/database documentation, automated tests, CI and container templates. See verification records for deployment and tested scope.
