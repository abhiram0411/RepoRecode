# Vercel and Supabase setup

Updated 26 October 2026. Vercel Hobby serves https://repo-recode.vercel.app/ from public GitHub commit 5d58fcf0af3cdcfcfc39beaa3f38f529895931d1, deployment BBRq3X7B8qBgV2XWMVSAiLTkvCJV (Ready). Supabase Free migrations 001–007 and Production-only server settings are applied. Do not recreate services or rerun migrations. All nine live HTTP checks and six synthetic feedback/activity requests passed; SQL verified duplicate prevention, revocation and final cleanup (zero test rows in both tables). Ten RLS tables and thirteen privileged functions are installed. GitHub OAuth and exact Auth return URLs are configured. Live single-account cloud checks passed on 24 October. See OWNER_NEXT_STEPS.md. The instructions below are maintenance reference, not a request to repeat setup.

## Free plans only

Create a personal Vercel Hobby account and a Supabase Free organization. Do not select a Pro trial, paid add-on, custom purchased domain, payment method or upgrade. Vercel Hobby is for personal, non-commercial use. If the intended use does not qualify, retain the existing host rather than upgrading. Supabase documents that Free organizations are not charged; quota exhaustion can restrict service. Free projects can pause after inactivity. These are availability limits, not permission to spend.

References checked on 23 October 2026: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Supabase cost control](https://supabase.com/docs/guides/platform/cost-control), [Supabase free project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Configure the frontend

1. Use the existing personal Hobby project **repo-recode**. The reviewed batch is already on GitHub main; do not create another project or clone the repository through Vercel.
2. Use Node 24, the Vite preset, `npm ci --ignore-scripts`, `npm run build`, and output directory `dist`. The root `vercel.json` records the build settings and security headers.
3. Keep Git-triggered deployments disabled (`git.deploymentEnabled: false`). Create a manual deployment for an approved batch. No deployment hooks, schedules or GitHub deployment action are added.
4. Production already has the public Supabase URL and publishable key. Guest learning passed with those settings present. Keep the free generated domain and exact Auth return origin; no purchased domain is required.

Production serves the Vite frontend plus a shared same-origin Node API. Supabase sign-in and explicit cloud project/preferences copies use the browser client. Hosted feedback/activity use the bounded database store; the local single-process file store is never enabled on Vercel. Private GitHub App and authenticated admin acceptance remain separate.

The app navigates within `/`. The backend uses an `/api/:path*` rewrite to its shared function; unknown API endpoints return JSON 404, never the HTML application.

## Hosted backend setup and maintenance

As of 26 October, hosted backend 5d58fcf is live and verified. Migration 007 and server settings are applied with owner approval. Packaging includes src/core/import.ts explicitly; route checks tolerate Vercel rewrite query metadata. All nine live HTTP checks, approved synthetic writes and cleanup passed. Do not rerun migrations. The numbered steps below document maintenance.

1. Keep the existing Hobby/Free plans. Migration 007 was applied in the SQL editor inside an explicit transaction. Never rerun 001–007 on this project. SQL-editor application does not create CLI migration-history entries.
2. Use `supabase/verify.sql` to confirm four additional RLS tables deny direct access, and four additional RPCs (`gateway_backend_status`, `gateway_admit_request`, `community_write`, `community_snapshot`) deny browser execution and permit only the server role. Check the backend version RPC returns 7 from a server-authorized context. Keep proof separate from two-account acceptance.
3. In Vercel **production server-only** environment settings set `APP_ORIGIN=https://repo-recode.vercel.app`, `SUPABASE_URL=https://oppotpgwkhyzgidjuonc.supabase.co`, and `SUPABASE_PUBLISHABLE_KEY` to the existing public key. Add `SUPABASE_SECRET_KEY` using the project's server secret, or the legacy `SUPABASE_SERVICE_ROLE_KEY` alternative. The existing server key was copied directly between the service dashboards with explicit owner approval, without logging or displaying it. Any new credential creation/rotation requires owner participation. Never paste secrets into chat, source, logs or a `VITE_` variable. Existing frontend `VITE_` settings stay public-only. Use one key variable per key type.
4. Set `HOSTED_BACKEND_ENABLED=true` only after the migration and server settings are ready. Missing configuration leaves hosted services disabled; missing migration/database failure prevents capability confirmation and protected writes. Do not configure a local file path, local-admin token or alert timer for hosted use. The adapter does not activate those features even if such values are present.
5. Publish one reviewed batch and inspect `/api/health` and `/api/community/status`. Confirm API routes return JSON and unknown routes return 404. Test approved disposable feedback/activity/revocation, administrator denial and service-unavailable behavior. Review the retention/limit policy in FREE_BACKEND_PLAN.md. Do not delete the owner's real account to test account deletion.
6. Keep the private GitHub App disabled until its separate owner setup and acceptance. Its existing server route is wired to the shared database store; Vercel's repository access and Supabase sign-in OAuth do not configure it.

Still pending: independent PostgreSQL connections for locking/admission/refresh verification, remaining provider/admin/disposable-account acceptance, and owner-deferred two-account tests. Disabling `HOSTED_BACKEND_ENABLED` and publishing the configuration stops hosted API operations without deleting stored records. Retention cleanup is opportunistic; it is not a scheduled job.

## Configure Supabase

1. Use the existing RepoRecode Free project above. Its creation/password step is complete. Keep its database password in your password manager.
2. Migrations `001_initial.sql` through `006_github_lifecycle.sql` are already applied to this project; do not run them again. For a different empty project, apply them in filename order and inspect results. Historical AI quota tables are inactive. This was a manual SQL editor application, not a Supabase CLI migration-history update. Use `supabase/verify.sql` for read-only inspection.
3. In Vercel's production environment settings, set `VITE_SUPABASE_URL` to the project's HTTPS origin and `VITE_SUPABASE_PUBLISHABLE_KEY` to its public publishable key. A legacy `VITE_SUPABASE_ANON_KEY` is also supported; set only one key variable. Never use a secret/service-role key or database password in any `VITE_` setting. Build validation rejects incomplete settings, invalid origins and recognized privileged keys without logging values.
4. Set Supabase Auth Site URL and allowed redirect URL to the exact production origin. Avoid wildcard preview callbacks. Use a separate staging project/origin for acceptance.
5. Enable GitHub OAuth in Supabase. In the GitHub OAuth app, use the callback URL shown by Supabase; store the OAuth client secret only in Supabase. GitHub OAuth sign-in and the private-repository GitHub App are separate integrations. Configure Google separately if needed. Keep email confirmation enabled; test delivery within the provider's free limitations.
6. Public frontend settings are embedded at build time; rebuild only when those settings or the reviewed code batch change. Supabase provider/redirect changes alone do not require a new frontend deployment. Keep server-only settings out of frontend bundles and all VITE_ variables.

Reference: [Supabase API key types](https://supabase.com/docs/guides/getting-started/api-keys). Local validation checks format and known privileged-key types; only real Supabase requests verify a key and the deployed policies.

## Acceptance before calling setup complete

The next frontend batch reads enabled email/social providers from Supabase's public `/auth/v1/settings` endpoint, with a timeout and retry state. It does not offer unverified social providers while loading or on failure. Manual linking is not included in those public settings: leave `VITE_AUTH_IDENTITY_LINKING=false` unless manual linking has also been enabled and tested in Supabase. This flag only controls UI availability; Supabase still authorizes the actual operation. Existing-password sign-in does not impose the new-password length policy.

Use two distinct test accounts. Verify sign-in, callback return, email confirmation/recovery, TOTP, account linking and local/other/global sign-out. Upload a small non-sensitive sample as account A; confirm B cannot list, fetch, overwrite or delete it, including direct REST requests. Verify restore merges matching snapshots and retains drafts; test cloud deletion and preference ownership. Verify guest learning with the service unavailable. Actual disposable-account deletion and private imports still need their separate live acceptance. The gateway is configured; never delete the owner’s real account for testing.

On the final Vercel URL check startup, imports, WASM grading, previews, mobile layout, security headers and source download. Save deployment URL/commit/build evidence separately from local test receipts. Never report a local build as proof of live Auth, RLS or deployment success.

The owner must complete account creation and sign-in. Passwords, recovery codes and secret keys should never be pasted into chat.
