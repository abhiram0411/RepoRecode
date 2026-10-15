# Current plan

## Current local update — awaiting publication

Nested-object practice now supports two object levels and three scalar leaves across a parameter, preserving omitted/undefined nested containers and leaves. Every independent variation must fit within 16 object samples; wider shapes are rejected. Three parameters and 64 function probes remain the outer cap. Nested named contracts and readonly leaves work. ANALYSIS_VERSION=5 enables saved-index refresh. Footer/Support links point to the public GitHub repository and issues.

235 unit/integration tests in 30 files passed in 14.98 seconds. The first build found a TypeScript narrowing error; corrected it and the production build passed. All 23 local browser journeys passed in 72.72 seconds, including nested missing-field grading, correction, reload and mobile Support links. Both new screenshots were visually inspected. Source scan checked 161 files with no heuristic findings. No dependencies changed. Publication and new GitHub CI are pending for this update.


Version 11 is public. The reported GitHub theme-persistence failure is fixed and application CI passed. Named input types are implemented. 228 unit/integration checks and 22 local browser journeys pass. Version 11 full live run: 19 passed, 1 local-only skip, 2 failed. Two five-second assertions expired while work was still pending: nullable/default grading and the styled preview's transition from initial HTML to interactive events. Tests now allow 30 seconds for those existing completion signals, retaining the result assertions. Both targeted public repeats: 2 passed, 0 failed in 37.32 seconds. Preserve both receipts; this is not a newly all-green full live run. Receipts: artifacts/public-browser-results-v11.json and public-practice-retry-v11.json.

Continue the exact implementation/provider/operations backlog in RESUME.md and MASTER_SPEC.md. Do not spend money or revive the tutor. Keep post-publication documentation/test corrections synchronized without claiming they are already in the immutable version 11 source ZIP.
