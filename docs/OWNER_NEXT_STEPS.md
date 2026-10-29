# RepoRecode: completed setup and remaining work

Updated 29 October 2026. Vercel Hobby serves https://repo-recode.vercel.app/ from public GitHub commit 5d58fcf0af3cdcfcfc39beaa3f38f529895931d1, deployment BBRq3X7B8qBgV2XWMVSAiLTkvCJV (Ready). Supabase Free migrations 001–007 and Production-only server settings are applied. Do not recreate services or rerun migrations. All nine live HTTP checks and six synthetic feedback/activity requests passed; SQL verified duplicate prevention, revocation and final cleanup (zero test rows in both tables).

## Completed

- Existing Vercel Hobby and Supabase Free projects are connected. Automatic Git deployments remain disabled. No paid service was added.
- GitHub sign-in, callback, logout/relogin and the approved Trail journal cloud save/restore/delete/preferences checks passed. The cloud sample was removed; local sample/progress and default account preferences remain.
- Hosted feedback retries reuse one record; changed content with the same identifier is rejected. Activity revocation clears recorded days and rejects a delayed retry. Both synthetic records were permanently removed with owner approval; final SQL counts are zero.
- Production-only server secret was saved with explicit owner approval. No secret belongs in frontend variables, source or chat. Migration 007 is applied and verified; backend version is 7.
- Provider-aware controls, deletion-capability checks and patched Zod 4.6.6 are deployed.

GitHub run 40322121312 passed 353 tests / 42 files, build, isolated package smoke with rewrite query metadata, audit (zero vulnerabilities), source scan (205 files, zero findings), 36 Chromium journeys and five development journeys. The public source archive passed: 247 files, 3,768,376 bytes, SHA-256 a144f0f3092ef3ded9ffbc60613118091ffd62f7fd7b422659448dacc156c9a4. Six live guest journeys passed on 261eca4; the later corrections changed backend packaging/routing, not frontend application code.

- Local Docker verification passed on 29 October: ten independent PostgreSQL concurrency checks, six container/HTTP checks and eight Edge browser journeys. The native PostgreSQL download and test cluster were removed, and all temporary Docker containers were cleaned up. Docker images remain cached. These local changes are not deployed. See RESUME.md for receipts.

## Remaining

Remaining: owner-deferred two-account isolation; recovery/TOTP/linking/global-session and disposable-account deletion acceptance; private GitHub App setup; live administrator role/MFA acceptance; broader learning/indexing/preview work; device-session inventory; manual accessibility/Safari/low-end checks; production container volume/proxy validation and security/operator review. Health advertising account deletion is not proof of real deletion. Never test deletion on the owner’s account. Google and linking remain disabled.

The full master specification remains incomplete. See FEATURES.md and MASTER_SPEC.md for exact support boundaries. Optional local Ollama remains unfinished; the Coding Pet is silent and reactions-only, with no paid AI tutor. The 28 October report refresh records successful f5bf22b CI: 371 tests, 37 Chromium, 37 WebKit and five development journeys. This newer GitHub batch is not deployed.

## Continue safely

Strict ₹0: no cards, upgrades, paid trials, overages, paid AI or paid SMTP. Do not recreate services or redeploy documentation edits. Credential creation/rotation and authenticator enrollment need owner participation; never request secrets in chat.

Use RESUME.md for recovery. Root is the dirty Sites history; never push/reset it. Public GitHub work uses tmp/github-v10; check remote main before publishing a reviewed batch and preserve independent work. Old Sites version 17 remains unchanged, with separate device-local data.

Evidence: artifacts/github-ci-5d58fcf.json, hosted-live-http-results.json, hosted-live-source-results.json, hosted-live-write-results.json, hosted-test-cleanup-verified.png, supabase-backend-setup.json and vercel-hosted-setup.json. These receipts postdate the immutable deployed archive.
