# RepoRecode: completed setup and remaining work

Updated 26 October 2026. Free/Hobby only: no card, paid trial, credits, upgrade or overages are authorized.

## Done — do not repeat provisioning

- Live app: https://repo-recode.vercel.app/
- The live deployed source is `261eca4f97f52d0905c385a2ecb32f3d40306d06` (deployment 8CtRBsTnifq8sEHnEBZqoh1Af79q). Six guest browser journeys passed. The hosted API currently fails to start because Vercel omitted a shared TypeScript module; a packaging correction is prepared. Earlier release: d826327. [CI run 39998485583](https://github.com/abhiram0411/RepoRecode/actions/runs/39998485583) succeeded: 327 tests, build, audit/source checks, 34 Chromium journeys and development acceptance. Its audit result is historical; newer fixes are recorded below.
- Vercel project **repo-recode**, personal Hobby team, Vite, Node 24.x, is Ready. Two intentional deployments have been made, including the 26 October backend attempt. `vercel.json` disables automatic Git deployments.
- Supabase **RepoRecode** is on Free, reference `oppotpgwkhyzgidjuonc`. Migrations 001–007 are applied; ten tables have row-level security. Migration 007 adds four tables with no direct browser/server-role access and four server-only RPCs. The backend version check returns 7. **Do not rerun those migrations.** SQL-editor execution did not register CLI migration history.
- Vercel production has the Supabase project URL and browser publishable key. No service-role key or database password was placed in frontend settings.
- GitHub OAuth is enabled. The owner saved its credentials; the enabled switch and production Auth URLs were subsequently saved with approval. Site URL: `https://repo-recode.vercel.app`. Allowed return: `https://repo-recode.vercel.app/`. GitHub OAuth callback: `https://oppotpgwkhyzgidjuonc.supabase.co/auth/v1/callback`.
- Live GitHub sign-in, callback exchange, local sign-out and repeat sign-in passed. Only read-only email access was granted, not private repository access.
- With owner approval, the built-in Trail journal sample uploaded and restored (one merge, no duplicate/conflict). Default preferences saved/restored, including reverting a temporary local clothing change. The test cloud project was deleted and a later restore found zero projects. The local sample and default account preferences remain.
- Live sample analysis, eight practice probes, an interactive React state update, source ZIP download and security headers passed. These are focused live checks, not full production certification.

## Next setup work

The newer provider-controls commit 605766f passed tests/build on GitHub but its run 40175856556 stopped on a Zod advisory. The local follow-up pins patched 4.6.6 (zero audit findings), checks account-deletion backend availability before offering deletion and rejects malformed success responses. Its 339 tests and build passed; all 35 Edge browser journeys passed. Follow-up commit 23c3dd4 passed GitHub run 40203852450, including 35 Chromium and 5 development journeys. It is not deployed. Earlier zero-audit results above are historical, not a statement about the currently deployed dependency after new advisories.

1. Verify isolation with two distinct test accounts: one must not list, fetch, overwrite or delete the other's project/preferences, including direct API requests. Only single-account acceptance has run. The owner deferred this test because a second account is not available now.
2. Complete email delivery/recovery, TOTP and identity-linking acceptance. Keep email confirmation enabled. Credential creation/changes and authenticator enrollment require the owner's participation; never send secrets in chat. Default email service restrictions have not been tested. Do not buy SMTP as a workaround.
3. Google is still disabled. Its button currently appears in deployed d826327. A tested local follow-up now reads actual provider availability and omits disabled providers; publish it with the next reviewed batch. Manual identity linking is also disabled; its new UI flag defaults off. Do not enable that flag until the server setting is enabled and tested.
4. The optional private-repository GitHub App is separate from both sign-in OAuth and Vercel's deployment integration. It still needs server configuration and live acceptance.
5. The durable backend is now prepared locally for hosted anonymous feedback, activity/revocation, administration and account deletion. It passed 353 local tests plus native Node entry checks; production build and all 36 Edge browser journeys passed, including local feedback. The fresh dependency audit and source scan are clear. Commit 261eca4 passed GitHub run 40228562623 (353 tests, 36 Chromium and 5 development journeys). Migration 007 was applied and verified with owner approval. Production-only URLs, public key, existing server secret and activation flag were saved in Vercel after the owner explicitly approved the privileged connection and one deployment. The deployment is Ready but API startup failed due to the missing shared source file. An explicit packaging include and isolated-folder smoke test are prepared; replacement deployment/acceptance is pending. Never send secrets in chat. Do not enable billable storage.

## Remaining engineering and verification

- Generic functions, constrained/deeper input types, persistent indexing/watchers, broader indirect state/API relationships, and more preview dependencies/frameworks.
- Individual-device session inventory, simultaneous PostgreSQL connection tests and private GitHub lifecycle acceptance.
- Manual accessibility, WebKit/low-end devices, Docker execution, independent security review and operator contacts. The attempted live mobile viewport override did not visibly take effect, so it does not count as a mobile test.
- Optional local Ollama remains unfinished. The Coding Pet is silent and reactions-only; a paid AI tutor is not planned.

## Safe continuation

Use `docs/RESUME.md`, `docs/FEATURES.md` and `docs/MASTER_SPEC.md`. The master specification remains incomplete. Do not recreate Vercel/Supabase or repeat deployment for documentation changes.

Root is the separate Sites Git history and contains intentional local changes. GitHub publication uses `tmp/github-v10`; never push root history to GitHub, reset dirty files, or overwrite independently created branches/PRs. Before another push, check remote main and reconcile changes. Batch verified code for one deliberate deployment.

The existing Sites version 17 remains at https://reporecode-learning-lab.milkyibex8.chatgpt.site/ and has not been republished. Its device-local data is separate from Vercel. Use learning-progress export/import to move progress; full project exports contain source code.

Evidence: `artifacts/vercel-setup.json`, `vercel-live-acceptance.json`, `vercel-source-download.json`, `supabase-setup.json` and associated local screenshots. These later receipts are not in the already deployed immutable source archive.
