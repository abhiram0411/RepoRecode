# RepoRecode: completed setup and remaining work

## 2 November — private import passed; local preview/import fixes

Production is Ready at https://repo-recode.vercel.app on commit 10051d7b0e1bac80a1dbc2ac3458ae966cdb980f, deployment BXgf4jwU2zKidcN4cuhyaqvRNUVh. Nine HTTP/source checks passed (artifacts/github-app-release-http.json). GitHub OAuth callback and repository listing passed. On 2 November, with explicit owner approval, created private abhiram0411/reporecode-private-acceptance with README and synthetic App.tsx, commit 6952df4253b552c488d22bdea741ee4a927db9c0. Added only this fixture to installation 176817799 alongside RepoRecode, preserving Contents/Metadata read-only. The live app imported one source file and indexed double/App (two declarations). No personal source uploaded; no cloud save performed. Fixture and local imported snapshot remain for follow-up; deletion was not approved. Screenshot: artifacts/github-private-import-passed.png.

Fixed a reproducible preview readiness race locally: newly painted snapshots were clickable before their deferred trusted bridge loaded. Body starts inert and the bridge enables it after installing handlers, before restoring focus. Delaying bridge delivery 350 ms reproduced the failure on production; three local development repeats and all four Edge production-preview/isolation journeys passed. This preserves the opaque iframe and strict script policy. GitHub oversized/truncated imports now return a safe HTTP 413 with source-folder guidance instead of generic 502. Added three gateway regressions, including private provider-error redaction. No import limits increased.

Validation: build/source packaging passed; 18 focused unit tests passed. Full suite initially had one timing-sensitive generic evaluation failure during concurrent build; all 548 tests in 50 files passed with two workers after build. Receipts: artifacts/preview-readiness-before.json, preview-readiness-after.json, preview-readiness-production.json, preview-import-fixes-full-unit.json, preview-import-fixes-full-recheck.json. WebKit form/state/inspection passed; isolation initially failed at browser launch, and its separate retry passed (artifacts/preview-readiness-webkit-isolation.json). These code fixes remain LOCAL, not published/deployed. Production full RepoRecode import returned generic error and contains a 250799-byte generated source file exceeding 128 KiB; the exact server exception was not inspected, so this is a likely cause, not confirmed telemetry.

Next: publish this reviewed fix batch and verify CI, then one batched deployment when appropriate (automatic deployment stays disabled). Complete outside-installation denial/disconnect/expired-token live acceptance, owner-deferred two-account isolation, disposable-account recovery/MFA/session/deletion checks, native folder permission/manual accessibility/real Safari/low-end checks, and remaining broader learning/preview/operator scope below. Keep all services free, never delete real owner account, never push/reset the dirty root checkout; use tmp/github-v10 and preserve its .gsd/.

Updated 30 October 2026. Vercel Hobby serves https://repo-recode.vercel.app/ from public GitHub commit 5d58fcf0af3cdcfcfc39beaa3f38f529895931d1, deployment BBRq3X7B8qBgV2XWMVSAiLTkvCJV (Ready). Supabase Free migrations 001–007 and Production-only server settings are applied. Do not recreate services or rerun migrations. All nine live HTTP checks and six synthetic feedback/activity requests passed; SQL verified duplicate prevention, revocation and final cleanup (zero test rows in both tables).

## Completed

- Public source e8aed58 passed GitHub CI 40937113683: 544 unit/integration tests, Docker concurrency, build/package/audit/source checks, 41 Chromium, 41 WebKit and five development journeys. The subsequent Docker storage/error-handling batch passed seven local volume checks, 545 unit/integration tests and the build; published as 10051d7 and passed CI 41022641387 with all 87 browser/development journeys. No extra deployment.

- Existing Vercel Hobby and Supabase Free projects are connected. Automatic Git deployments remain disabled. No paid service was added.
- GitHub sign-in, callback, logout/relogin and the approved Trail journal cloud save/restore/delete/preferences checks passed. The cloud sample was removed; local sample/progress and default account preferences remain.
- Hosted feedback retries reuse one record; changed content with the same identifier is rejected. Activity revocation clears recorded days and rejects a delayed retry. Both synthetic records were permanently removed with owner approval; final SQL counts are zero.
- Production-only server secret was saved with explicit owner approval. No secret belongs in frontend variables, source or chat. Migration 007 is applied and verified; backend version is 7.
- Provider-aware controls, deletion-capability checks and patched Zod 4.6.6 are deployed.

GitHub run 40322121312 passed 353 tests / 42 files, build, isolated package smoke with rewrite query metadata, audit (zero vulnerabilities), source scan (205 files, zero findings), 36 Chromium journeys and five development journeys. The public source archive passed: 247 files, 3,768,376 bytes, SHA-256 a144f0f3092ef3ded9ffbc60613118091ffd62f7fd7b422659448dacc156c9a4. Six live guest journeys passed on 261eca4; the later corrections changed backend packaging/routing, not frontend application code.

- Local Docker verification passed on 29 October: ten independent PostgreSQL concurrency checks, six container/HTTP checks and eight Edge browser journeys. The native PostgreSQL download and test cluster were removed, and all temporary Docker containers were cleaned up. Docker images remain cached. These local changes are not deployed. See RESUME.md for receipts.

- Docker Engine 29.8.1 recovered on 30 October without a factory reset. Seven synthetic persistent-volume checks passed and their test resources were removed, including replacement, revocation, read-only/damaged storage and snapshot recovery. Deployed HTTPS, actual operator volumes and external backup procedures remain unverified.

## Remaining

Remaining: owner-deferred two-account isolation; recovery/TOTP/linking/global-session and disposable-account deletion acceptance; private GitHub App setup; live administrator role/MFA acceptance; broader learning/indexing/preview work; device-session inventory; manual accessibility/Safari/low-end checks; production container volume/proxy validation and security/operator review. Health advertising account deletion is not proof of real deletion. Never test deletion on the owner’s account. Google and linking remain disabled.

The full master specification remains incomplete. See FEATURES.md and MASTER_SPEC.md for exact support boundaries. Optional local Ollama remains unfinished; the Coding Pet is silent and reactions-only, with no paid AI tutor. The 28 October report refresh records successful f5bf22b CI: 371 tests, 37 Chromium, 37 WebKit and five development journeys. This newer GitHub batch is not deployed.

## Continue safely

Strict ₹0: no cards, upgrades, paid trials, overages, paid AI or paid SMTP. Do not recreate services or redeploy documentation edits. Credential creation/rotation and authenticator enrollment need owner participation; never request secrets in chat.

Use RESUME.md for recovery. Root is the dirty Sites history; never push/reset it. Public GitHub work uses tmp/github-v10; check remote main before publishing a reviewed batch and preserve independent work. Old Sites version 17 remains unchanged, with separate device-local data.

Evidence: artifacts/github-ci-5d58fcf.json, hosted-live-http-results.json, hosted-live-source-results.json, hosted-live-write-results.json, hosted-test-cleanup-verified.png, supabase-backend-setup.json and vercel-hosted-setup.json. These receipts postdate the immutable deployed archive.
