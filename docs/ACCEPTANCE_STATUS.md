# Acceptance status

Final local batch verification: 560/560 unit/integration tests, 44/44 Edge production-browser journeys and 44/44 WebKit production-browser journeys passed (no skipped or flaky browser tests). Production build and source packaging passed; heuristic source scan checked 241 files with zero findings. React review confirmed no conditional hooks, no new external service/dependency, no continuous spotlight animation loop, keyboard-operable controls and tested motion/accessibility safeguards. Publication, Linux CI for this new batch and production deployment have NOT occurred; automatic approval-review usage remains the external blocker.

Updated 2 November 2026. This separates implemented behavior from checks needing accounts, devices or release access. It does not expand the master specification's optional enhancements into mandatory first-release work. See RELEASE_STATUS.md for the deployed commit and current unpublished changes.

## Core acceptance from MASTER_SPEC.md §57

| Criteria | Implementation and evidence | Limit |
| --- | --- | --- |
| 1–4: Open, guest mode, import, analysis | `e2e/journey.spec.ts` imports synthetic real source and verifies the resulting project; parser/input tests validate source facts | Supported JS/TS/React and bounded CSS; no universal framework claim |
| 5–7: Dependencies, roadmap, explanations | Journey/source-graph tests; curriculum, explanation and lesson tests; source walkthroughs | Static evidence and deterministic explanations, no generative tutor |
| 8–11: Practice, rewrite, feedback, correction | Journey and typed-input browser suites; evaluator tests use isolated real execution | Finite probes, not general equivalence or production certification |
| 12–14: Save/export/import progress | Journey tests reload and transfer progress into a second browser context; progress and restore tests cover conflicts and deduplication | Exact source snapshot required; progress is device-authored |
| 15–16: Preview and technical flow | Preview, isolation, API-path, state-link and state-derivation browser suites | Imported source remains isolated; unsupported runtime/browser features are disclosed |
| 17: Themes | `e2e/themes.spec.ts` checks all 15 palettes, persistence, Monaco and preview independence | Device/real-screen appearance still needs human assessment |
| 18–19: Pet customization and reactions | Expanded profile and journey tests check visible preferences and reactions tied to practice outcomes | Silent non-AI companion; no chat, voice or tutor |
| 20: Optional feedback | Public/local/hosted feedback suites plus prior approved live synthetic write/retry/cleanup | No automatic public issue creation; activity is separate and opt-in |

The deployed 3b50cc4 batch passed 41 Chromium and 41 WebKit journeys on Linux CI. Current new tests and features are local until publication/CI/deployment succeed. Historical green CI does not validate later local changes.

## Current local product improvements

- GitHub App imports clear the workspace loading state after success, repeat imports and processing errors; avoids disabled subsequent import controls.
- Feature missions now offer numeric doubling, uppercase string results and reversed boolean results. Type mismatches, numeric overflow, oversized transformed outputs and indistinguishable changes are rejected. Mission progress remains separate from original-function mastery and survives current backup/progress restoration.
- The overview uses an adapted React Bits spotlight only on project cards. It adds no service, package or continuous animation loop. The separate upstream license/attribution is preserved; RepoRecode original code remains MIT. Motion-off, reduced-motion and keyboard behavior are checked.

## Required remaining release actions

1. Publish the complete reviewed batch after automatic approval review is available. The previously prepared two-file GitHub tree is stale: the mission and spotlight work must be included in a new tree.
2. Verify GitHub CI for the exact resulting commit, then make one approved production deployment and run the relevant live checks. Current production remains 3b50cc4.
3. Complete live GitHub disconnect/reconnect and an actual expired-token refresh when browser access is available. Synthetic lifecycle tests already cover refresh concurrency, revoked grants and disconnect races.
4. Complete the owner-deferred real second-account isolation and disposable-account security checks. Never delete or alter credentials on the owner's real account to substitute for a disposable account.
5. Complete authenticated live administrator/MFA acceptance when the authorized test identity is available. Existing automated denial/MFA tests do not prove that live setup.
6. Finish native folder-picker permission, manual screen-reader, real Safari and low-end-device acceptance with the relevant device/user participation.

## Conditional and optional scope

Optional local Ollama is not a dependency of any core acceptance criterion and remains unimplemented. The tutor remains retired. Device-by-device session inventory, universal dynamic data flow, arbitrary package execution and arbitrary feature grading are not claimed. These may be future product extensions; bounded support is documented in FEATURES.md.

Production Docker proxy/volume/external-backup checks apply only if an operator deploys the provided Docker setup. The current hosted site uses Vercel/Supabase; prior local Docker checks passed. Independent security/legal assessment is not replaced by the automated tests.

Free-only constraints remain: no paid plans, cards, subscriptions, trials, paid AI or purchases. Do not recreate the configured services or redeploy documentation edits.
