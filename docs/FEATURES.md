# Feature coverage

| Area | Implemented behavior | Remaining boundary |
| --- | --- | --- |
| Imports | Public GitHub, folder, ZIP, validated restoration; plain local CSS included | Bounded JS/TS/CSS source; private App needs live setup |
| Analysis | Declarations, variable facts, source locations, imports, calls, JSX tree, architecture candidates; unchanged-file parsing cache and one reference traversal per file | Semantic index is rebuilt; no persistent/incremental semantic index, complete dynamic data-flow engine or multilingual indexing |
| Roadmaps | User experience/goal and real call prerequisites | Static curriculum is templated; source limits remain 200 files / 2 MiB |
| Explanations | Deterministic source facts, walkthroughs, glossary, hints and quizzes | No generative tutor; explanations are bounded to indexed source evidence |
| Practice | Rewrite, completion, typed predictions, concept quiz, mutation-based debugging, refactor; scalar unions, nullable/optional/default inputs, scalar arrays, fixed tuples and shallow inline objects, simple resolved aliases and interfaces; component reconstruction using actual isolated React renders | Up to three parameters / 64 finite function probes; objects limited to three scalar fields / 16 samples (four base choices per field); no nested object/array fields, generic/recursive/inherited/merged types, rest parameters or nested arrays; component checks cover initial DOM for up to six primitive-prop samples, not events/later state/full type checking |
| Missions | Numeric output modification and independent build unlock after original passes | Limited contract family; not arbitrary feature evaluation |
| Interviews | Project-specific prompts and saved explanations | Reflection is explicitly not automatically graded |
| Correctness | Type environment, known reference probes, equivalent outputs, time limits | Finite coverage; not production correctness proof |
| Preview | Initial and interactive React; state/reducers/synchronous effects; controlled forms; source navigation; edited snapshots and error recovery | No DOM refs, timers, async handlers, arbitrary packages or full CSS/browser semantics |
| Observed calls | Event delivery, changed HTML and up to 100 imported function entries per action with source links | No complete call stack, state-value, data-flow or network tracing; local evidence cannot award mastery |
| Observed state | Up to 100 resolved React useState/useReducer reads per action with source links, primitive values and bounded object summaries | Render order only; no instance identity, final state inventory or before/after diff; no automatic mastery |
| Static state links | Declaration-resolved reads, updater calls, initializer and prop references; source-linked list and diagram | Direct const hook tuples only; no alias or indirect flow propagation, execution-order or computed-value proof; 200 relations indexed / 60 diagrammed |
| Preview styles | Sanitized local side-effect CSS imports, variables, layout, typography, bounded media queries, omission notices and per-session sanitized-style reuse | 256 KiB loaded CSS; no CSS modules, bound imports, nesting, animations, external resources or exact browser visual-equivalence grading |
| Workspace | Monaco, graphs, panel sizing, auto-saved drafts, mode switch, startup reload guidance if scripts fail | Desktop and mobile Chromium checked; other browsers need verification |
| Progress | Once-only XP, levels, achievements, mastery, mission gates | No competitive trust, streak service, leaderboard or certification |
| Profile | Name, original characters, hair/outfit/accessories, color/background, safe raster uploads | Account sync requires Supabase |
| Coding Pet | Original distinct Boy/Girl/Robot, silent finite reactions to practice and verified checks, independent accessories, hair/clothing/body customization, hidden/size/position persistence | No AI, chat, explanations, speech, microphone or sign-language claim |
| Appearance | 15 semantic palettes, matching Monaco/graphs, swatches, active state, persistence/reset, optional live device light/dark following, Motion and reduced-motion support | Imported app colors stay independent; automatic mode uses the Fieldwork light/dark pair and retains manual palette selection |
| Portability | Versioned learning-only JSON, exact source hash, monotonic/deduplicated merges, preserved drafts/notes; separate full backups | Changed source revisions are rejected; progress is device-authored, not trusted certification |
| Feedback | Bounded anonymous feature/bug/general form, optional rating/contact, durable local store and protected admin review | Public static host has no configured feedback gateway; single-process file store caps at 1,000 messages |
| Activity | Explicit opt-in, random browser ID hashed server-side, day-only records, revoke/delete, 30-day inactive expiry | Counts browsers rather than people; GitHub/download metrics unavailable until connected |
| Accounts | Google/GitHub/email, linking, recovery, TOTP, local/other/global sign-out, deletion | Not live tested; device-by-device session inventory is not implemented |
| Cloud | Owner-scoped projects/preferences; explicit upload/restore/delete; restore merges identical snapshots, preserves drafts/notes and changed-source copies in an atomic transaction | No background sync; migrations and live provider acceptance remain pending |
| GitHub App | Shared one-use PKCE/state, encrypted access/refresh tokens, leased rotation, disconnect-safe conditional writes, selected authorized repositories and bounded imports | Migration 006 and owner setup required; live GitHub/Supabase and multi-connection concurrency acceptance pending; expired refresh grants require reconnection |
| Operations | Admin role and MFA, process metrics, database aggregates, request history, quotas, alert transitions, watchdog | No provider CPU/memory/slow-query or billing adapters, distributed logs/queue, or live alert delivery |
| Release | MIT, source, docs, CI, Docker templates, reports | Docker engine unavailable; independent assessment and legal review pending |

This release does not fabricate runtime diagrams, AI answers, account state, infrastructure costs, cloud success or test certificates.
