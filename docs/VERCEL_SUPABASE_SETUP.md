# Vercel and Supabase setup

Status on 25 October 2026: Vercel Hobby serves https://repo-recode.vercel.app from GitHub commit `d826327e4c9911ac944493c301d49d982fd905a6`; deployment `2uJCresyQTDG6tY9YXoD6AWGbv8n` is Ready and GitHub run `39998485583` succeeded. Supabase Free project **RepoRecode**, reference `oppotpgwkhyzgidjuonc`, has migrations 001–006, six RLS tables and nine server-only privileged functions. Frontend public settings, GitHub OAuth and exact production Auth URLs are configured. Live single-account login/logout/relogin, sample upload/restore/delete and preference restoration passed on 24 October. Two-account isolation, email recovery, MFA, linking, Google and backend-only features remain pending. Sites version 17 remains unchanged. See [owner's next steps](OWNER_NEXT_STEPS.md). The instructions below are reference for setup/maintenance, not a request to recreate completed resources.

## Free plans only

Create a personal Vercel Hobby account and a Supabase Free organization. Do not select a Pro trial, paid add-on, custom purchased domain, payment method or upgrade. Vercel Hobby is for personal, non-commercial use. If the intended use does not qualify, retain the existing host rather than upgrading. Supabase documents that Free organizations are not charged; quota exhaustion can restrict service. Free projects can pause after inactivity. These are availability limits, not permission to spend.

References checked on 23 October 2026: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase cost control](https://supabase.com/docs/guides/platform/cost-control), [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Configure the frontend

1. Use the existing personal Hobby project **repo-recode**. The reviewed batch is already on GitHub main; do not create another project or clone the repository through Vercel.
2. Use Node 24, the Vite preset, `npm ci --ignore-scripts`, `npm run build`, and output directory `dist`. The root `vercel.json` records the build settings and security headers.
3. Keep Git-triggered deployments disabled (`git.deploymentEnabled: false`). Create a manual deployment for an approved batch. No deployment hooks, schedules or GitHub deployment action are added.
4. Production already has the public Supabase URL and publishable key. Guest learning passed with those settings present. Keep the free generated domain and exact Auth return origin; no purchased domain is required.

This is a static frontend deployment. It does not run the Node gateway. Supabase sign-in and explicit cloud project/preferences copies use the browser client once configured. Account deletion, private GitHub App access, anonymous hosted feedback and gateway administration need an independently verified same-origin backend. Do not mount the existing single-process file store in a serverless function: its files, in-memory quotas and process metrics do not provide durable or distributed operation.

The app currently navigates within `/`, so no catch-all rewrite is configured. Missing API paths must not be rewritten to the HTML application.

## Configure Supabase

1. Use the existing RepoRecode Free project above. Its creation/password step is complete. Keep its database password in your password manager.
2. Migrations `001_initial.sql` through `006_github_lifecycle.sql` are already applied to this project; do not run them again. For a different empty project, apply them in filename order and inspect results. Historical AI quota tables are inactive. This was a manual SQL editor application, not a Supabase CLI migration-history update. Use `supabase/verify.sql` for read-only inspection.
3. In Vercel's production environment settings, set `VITE_SUPABASE_URL` to the project's HTTPS origin and `VITE_SUPABASE_PUBLISHABLE_KEY` to its public publishable key. A legacy `VITE_SUPABASE_ANON_KEY` is also supported; set only one key variable. Never use a secret/service-role key or database password in any `VITE_` setting. Build validation rejects incomplete settings, invalid origins and recognized privileged keys without logging values.
4. Set Supabase Auth Site URL and allowed redirect URL to the exact production origin. Avoid wildcard preview callbacks. Use a separate staging project/origin for acceptance.
5. Enable GitHub OAuth in Supabase. In the GitHub OAuth app, use the callback URL shown by Supabase; store the OAuth client secret only in Supabase. GitHub OAuth sign-in and the private-repository GitHub App are separate integrations. Configure Google separately if needed. Keep email confirmation enabled; test delivery within the provider's free limitations.
6. Public frontend settings are embedded at build time; rebuild only when those settings or the reviewed code batch change. Supabase provider/redirect changes alone do not require a new frontend deployment. Keep server-only settings out of the static frontend project.

Reference: [Supabase API key types](https://supabase.com/docs/guides/getting-started/api-keys). Local validation checks format and known privileged-key types; only real Supabase requests verify a key and the deployed policies.

## Acceptance before calling setup complete

The next frontend batch reads enabled email/social providers from Supabase's public `/auth/v1/settings` endpoint, with a timeout and retry state. It does not offer unverified social providers while loading or on failure. Manual linking is not included in those public settings: leave `VITE_AUTH_IDENTITY_LINKING=false` unless manual linking has also been enabled and tested in Supabase. This flag only controls UI availability; Supabase still authorizes the actual operation. Existing-password sign-in does not impose the new-password length policy.

Use two distinct test accounts. Verify sign-in, callback return, email confirmation/recovery, TOTP, account linking and local/other/global sign-out. Upload a small non-sensitive sample as account A; confirm B cannot list, fetch, overwrite or delete it, including direct REST requests. Verify restore merges matching snapshots and retains drafts; test cloud deletion and preference ownership. Verify guest learning with the service unavailable. Account deletion and private imports remain pending until the gateway is available and tested.

On the final Vercel URL check startup, imports, WASM grading, previews, mobile layout, security headers and source download. Save deployment URL/commit/build evidence separately from local test receipts. Never report a local build as proof of live Auth, RLS or deployment success.

The owner must complete account creation and sign-in. Passwords, recovery codes and secret keys should never be pasted into chat.
