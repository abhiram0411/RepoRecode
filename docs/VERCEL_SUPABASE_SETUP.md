# Vercel and Supabase setup

Status on 23 October 2026: the owner is signed into Vercel Hobby and Supabase Free. Supabase project **RepoRecode**, reference `oppotpgwkhyzgidjuonc`, is healthy. Migrations 001-006 succeeded together in a transaction through its SQL editor. Catalog checks confirmed six tables with row-level security and no anonymous SELECT grants, plus nine privileged functions with execution denied to anon/authenticated and granted to service_role. Real two-account acceptance remains pending. The startup `28P01` error resolved without a password reset. Vercel's GitHub App now includes RepoRecode after explicit owner approval; its import form is prepared but no project or deployment has been submitted. Public version 17 remains on Sites. See [owner's next steps](OWNER_NEXT_STEPS.md).

## Free plans only

Create a personal Vercel Hobby account and a Supabase Free organization. Do not select a Pro trial, paid add-on, custom purchased domain, payment method or upgrade. Vercel Hobby is for personal, non-commercial use. If the intended use does not qualify, retain the existing host rather than upgrading. Supabase documents that Free organizations are not charged; quota exhaustion can restrict service. Free projects can pause after inactivity. These are availability limits, not permission to spend.

References checked on 23 October 2026: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase cost control](https://supabase.com/docs/guides/platform/cost-control), [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Configure the frontend

1. Sign in to Vercel yourself. Select the personal Hobby account. Import the public RepoRecode repository after the reviewed local batch has been synchronized to its separate GitHub checkout. The existing GitHub main does not yet contain this batch.
2. Use Node 24, the Vite preset, `npm ci --ignore-scripts`, `npm run build`, and output directory `dist`. The root `vercel.json` records the build settings and security headers.
3. Keep Git-triggered deployments disabled (`git.deploymentEnabled: false`). Create a manual deployment for an approved batch. No deployment hooks, schedules or GitHub deployment action are added.
4. Initially leave Supabase variables empty to verify guest learning. Use the free generated Vercel domain. Record the final HTTPS origin for Auth callbacks.

This is a static frontend deployment. It does not run the Node gateway. Supabase sign-in and explicit cloud project/preferences copies use the browser client once configured. Account deletion, private GitHub App access, anonymous hosted feedback and gateway administration need an independently verified same-origin backend. Do not mount the existing single-process file store in a serverless function: its files, in-memory quotas and process metrics do not provide durable or distributed operation.

The app currently navigates within `/`, so no catch-all rewrite is configured. Missing API paths must not be rewritten to the HTML application.

## Configure Supabase

1. Use the existing RepoRecode Free project above. Its creation/password step is complete. Keep its database password in your password manager.
2. Migrations `001_initial.sql` through `006_github_lifecycle.sql` are already applied to this project; do not run them again. For a different empty project, apply them in filename order and inspect results. Historical AI quota tables are inactive. This was a manual SQL editor application, not a Supabase CLI migration-history update. Use `supabase/verify.sql` for read-only inspection.
3. In Vercel's production environment settings, set `VITE_SUPABASE_URL` to the project's HTTPS origin and `VITE_SUPABASE_PUBLISHABLE_KEY` to its public publishable key. A legacy `VITE_SUPABASE_ANON_KEY` is also supported; set only one key variable. Never use a secret/service-role key or database password in any `VITE_` setting. Build validation rejects incomplete settings, invalid origins and recognized privileged keys without logging values.
4. Set Supabase Auth Site URL and allowed redirect URL to the exact production origin. Avoid wildcard preview callbacks. Use a separate staging project/origin for acceptance.
5. Enable GitHub OAuth in Supabase. In the GitHub OAuth app, use the callback URL shown by Supabase; store the OAuth client secret only in Supabase. GitHub OAuth sign-in and the private-repository GitHub App are separate integrations. Configure Google separately if needed. Keep email confirmation enabled; test delivery within the provider's free limitations.
6. Manually rebuild the frontend once the public settings and callbacks are ready. Public settings are embedded at build time. Keep server-only settings out of the static frontend project.

Reference: [Supabase API key types](https://supabase.com/docs/guides/getting-started/api-keys). Local validation checks format and known privileged-key types; only real Supabase requests verify a key and the deployed policies.

## Acceptance before calling setup complete

Use two distinct test accounts. Verify sign-in, callback return, email confirmation/recovery, TOTP, account linking and local/other/global sign-out. Upload a small non-sensitive sample as account A; confirm B cannot list, fetch, overwrite or delete it, including direct REST requests. Verify restore merges matching snapshots and retains drafts; test cloud deletion and preference ownership. Verify guest learning with the service unavailable. Account deletion and private imports remain pending until the gateway is available and tested.

On the final Vercel URL check startup, imports, WASM grading, previews, mobile layout, security headers and source download. Save deployment URL/commit/build evidence separately from local test receipts. Never report a local build as proof of live Auth, RLS or deployment success.

The owner must complete account creation and sign-in. Passwords, recovery codes and secret keys should never be pasted into chat.
