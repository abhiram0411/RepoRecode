# Verification record

243 tests in 31 files and the production build passed. All 27 local Edge journeys passed (79.19 seconds) after the diagram refinement. The state-chain screenshot was inspected. The relationship picker, intermediate source controls and mobile width passed. Source scan: 167 files, no heuristic findings. Publication pending.

Version 13 is the latest published release. Its 235 tests, build, audit, source scan and all 26 Chromium journeys passed in GitHub run 38770487895. Full public v13 run: 24 passed, one local-only skip, one failure caused by counting the host bot-check POST. The write observer now checks app API/GitHub requests; all three public feedback repeats passed. Original and retry receipts are preserved separately.

The local suite includes a disposable anonymous-feedback gateway; the public suite intentionally skips that gateway test and does not submit real feedback. GitHub drafts are intercepted before submission. Anonymous hosted storage remains unconfigured.

All six SQL migrations execute in single-connection PGlite tests. Real provider setup, two-account RLS, MFA/recovery/deletion/cloud restore/private repositories and multi-connection PostgreSQL acceptance remain pending. Docker, manual accessibility, other browsers, low-end/load performance and independent security remain pending. No paid model is enabled.
