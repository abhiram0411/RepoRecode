# RepoRecode

**Learn it. Recode it. Master it.** Learn your own source through walkthroughs, practice, inspection and verified feedback.

**Free-only development release 0.1.0.** Core learning needs no account, database or model. Optional accounts, private GitHub access and hosted operations need owner configuration and live acceptance. Paid model routes are removed. See [the current specification](docs/MASTER_SPEC.md) and [remaining work](docs/RESUME.md); the full specification is not yet complete.

[Open the public development site](https://reporecode-learning-lab.milkyibex8.chatgpt.site) · [Source on GitHub](https://github.com/abhiram0411/RepoRecode) · [Download the source](https://reporecode-learning-lab.milkyibex8.chatgpt.site/downloads/reporecode-source.zip)

![RepoRecode workspace](artifacts/overview.png)

## Start locally

Use Node.js 24 and npm.

~~~sh
npm ci --ignore-scripts
npm run dev
~~~

Open the printed local URL. Choose **Explore the sample** or import a public GitHub repository, folder or ZIP. Select a lesson, read its actual source, choose **Hide & rewrite**, then run checks. Incorrect solutions fail; equivalent solutions can pass. Drafts save automatically on this device.

~~~sh
npm test
npm run build
npm run preview
~~~

## Learning features

- Commit-pinned public GitHub import; bounded folder and ZIP import; optional GitHub App repository picker.
- TypeScript AST index with exact source locations, functions, components, methods, classes, interfaces, types, variables and architecture signals.
- Import, resolved call and JSX component graphs. Candidate database/auth/router signals are labelled as candidates.
- Personalized dependency-ordered lessons, source walkthroughs, concept definitions, quizzes, output prediction and saved interview reflections.
- Rewrite, missing-code, verified bug-fix and refactoring exercises. Numeric feature modifications and independent missions use a changed output contract.
- Component reconstruction compares actual isolated initial renders across up to six primitive-prop samples. Event behavior and later state are explicitly outside these checks.
- Monaco editing, type diagnostics, finite reference-derived probes and isolated QuickJS execution.
- Initial and interactive React previews, source inspection, state/effect updates, bounded observed function calls and practice edits with last-good-render preservation.
- Source-linked state reads from resolved React useState/useReducer imports, with bounded local value summaries and explicit render-order limits.
- Static state relationships connect resolved state bindings to reads, updater calls, initializers and JSX props, including up to two const-initializer steps in the same function. Numbered diagram arrows, a relationship picker and intermediate source links keep the evidence readable and distinct from runtime observations.
- Imported plain CSS renders through an allowlist in isolated previews, including bounded variables, layout and media queries. Omitted rules are disclosed. Optional device-theme following updates the workspace and editor without changing imported app colors.
- Local projects, backups, revalidated restoration, duplicate-snapshot recognition, progress, XP, achievements, mastery ranks and mission unlocks.
- Fifteen complete workspace palettes with matching Monaco and graphs, original distinct Boy/Girl/Robot artwork, independent cap/glasses, hair/clothes/body customization and reduced-motion-aware animation.
- Optional Supabase sign-in, identity linking, recovery, TOTP MFA, session sign-out controls, account deletion, project and preference sync.
- Silent Coding Pet reacts to practice and verified results. Source explanations, including bounded arithmetic/condition descriptions, remain in the main learning UI.
- Versioned learning-only progress export/import, exact-revision validation and duplicate-safe merges that preserve drafts and notes. Full-source backups remain separately labeled.
- Optional local feedback gateway, anonymous submissions, protected admin counts, and strictly opt-in anonymous activity with revocation. Without a gateway, visitors can review a public GitHub issue draft or copy their full feedback. GitHub requires an account; anonymous hosted delivery still needs a free backend. Unavailable counts are never invented.
- Protected administration, usage accounting, request history, deduplicated email/Telegram alerts and an independent uptime monitor.

## Supported boundaries

Analyze JS/TS/JSX/TSX and simple React source. Function practice requires a standalone synchronous function with up to three explicitly typed parameters: number/string/boolean, bounded scalar literal unions (including null/undefined), scalar arrays (including readonly arrays), fixed tuples of up to three scalar entries, or inline objects of up to three scalar properties. Optional/default parameters include omitted and explicit undefined probes. Object properties retain missing versus explicit undefined and support readonly/optional fields. Each object gets up to 16 probes; primitive number/string fields use four samples, and literal-union fields must fit four choices. Nested objects, arrays inside objects, wider property unions, named aliases, rest parameters, nested arrays and optional/rest tuples remain unsupported. Component reconstruction supports exported components with no props or up to five inline/same-file primitive typed props. The type environment covers a deliberate subset of the standard library; component rendering does not perform full type checking. At most 64 finite probes check sampled inputs, not general equivalence. Progress is motivational and client-authored, not a certificate.

Older saved projects can refresh source analysis from Learning path without losing source, drafts, notes or progress. Identical reimports also refresh stale indexes. Prediction answers use typed comparison: object field order does not matter, while array order and value types do. Enter JSON or a top-level undefined, NaN, Infinity or -Infinity; compound outputs JSON cannot represent are not offered as prediction challenges.

React preview runs real React inside QuickJS. Choose **Interactive React**, render, then turn off **Inspect source locations** to use synchronous click, input, change and submit handlers. State, reducers and synchronous effects persist within the session. A bounded function-entry timeline links observed calls to source. Source or props changes require a fresh render; errors preserve the last working output. The frame cannot execute scripts.

This is a limited React runtime: DOM refs, timers, asynchronous handlers, navigation, arbitrary dependencies, network requests, external images and external stylesheets are unsupported. Plain local CSS must be imported for side effects. Explicit & nesting and media declarations support four combined block levels; implicit nesting and parser recovery text are omitted with notices. Default imports from local .module.css files expose up to 200 scoped class/ID names per file (100 characters per name). Composition, global module selectors, named/namespace CSS imports, animations and external fonts are unsupported. Loaded CSS is capped at 256 KiB with per-file limits; omitted rules/declarations are reported. Controlled forms use plain value/checked event data; full DOM event semantics and uncontrolled form persistence are not promised. State observations show up to 100 directly imported hook reads per action, including repeat renders and multiple instances, with bounded summaries. They are not a final state inventory, instance tracker, data-flow or network trace. The separate static state index traces const hook tuples and up to two const-initializer steps, with 200 relations in the list and 60 in the graph. React and the experimental reconciler are pinned together and require compatibility tests before upgrades.

Function probes vary every supported parameter before filling their 64-case budget. Comparison preserves missing/undefined/null distinctions and ignores plain object field insertion order. Unsupported callable or cyclic outputs cannot pass through JSON loss. Excluded reference inputs are reported; exception behavior is not graded.

Imports allow 200 source files, 128 KiB per file, 2 MiB total source and 5 MiB compressed ZIP. The browser holds at most 25 projects. Imported projects are never installed, modified or pushed back to their originals.

Consecutive imports reuse unchanged parsed files in memory while checking every source relationship again. Identical snapshots resume saved work; changed snapshots remain separate projects. The cache holds only the most recent import and is cleared on reload, project deletion or worker failure. This is incremental parsing within the existing limits, not a persistent index or automatic source watcher.

![Actual React source inspection](artifacts/react-preview.png)

## Architecture

~~~mermaid
flowchart LR
  Source[GitHub folder or ZIP] --> Bounds[Import validation]
  Bounds --> Worker[TypeScript index worker]
  Worker --> Lessons[Source index and lessons]
  Lessons --> UI[React workspace]
  UI --> Local[(IndexedDB)]
  UI --> Eval[Disposable QuickJS workers]
  Eval --> Results[Practice results and React snapshots]
  UI -. explicit consent .-> API[Authenticated Node gateway]
  API -.-> Provider[No external AI provider]
  API -.-> Github[GitHub App]
  UI -. explicit sync .-> DB[(Supabase with RLS)]
  API -.-> DB
~~~

React and Vite keep the core portable without requiring a server. Monaco, React Flow, TypeScript, QuickJS, IndexedDB, Zod and parse5 provide the editor, analysis, execution, storage and validation. No unnecessary framework or server runtime is imposed on local learning.

## Documentation and release

- [Installation and self hosting](docs/INSTALLATION.md)
- [Service setup checklist](docs/SERVICE_SETUP.md)
- [Architecture and database](docs/ARCHITECTURE.md)
- [Architecture diagrams](docs/DIAGRAMS.md)
- [API inventory](docs/API.md)
- [Feature coverage](docs/FEATURES.md)
- [Full requirements audit](docs/REQUIREMENTS.md)
- [Verification and deployment status](docs/VERIFICATION.md)
- [Security](SECURITY.md), [contributing](CONTRIBUTING.md), [roadmap](ROADMAP.md)

The owner approved the MIT license. See LICENSE and THIRD_PARTY_NOTICES.md. No paid subscriptions or live AI calls were made during development. The public MIT source is available at https://github.com/abhiram0411/RepoRecode; its first GitHub-hosted CI run passed. Publication status and any verified website address are recorded in the verification document.
