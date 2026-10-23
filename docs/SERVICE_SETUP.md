# Free-only setup

Core learning runs on your computer without an account, database, model or payment method. Never enable billing, a paid plan, automatic top-up or overages. An unavailable free service must stop safely; it must not switch to a paid fallback.

## Local learning

Use Node.js 24: `npm ci --ignore-scripts`, then `npm run dev`. Open the printed address. Import a folder, ZIP or the bundled sample. Public GitHub imports need connectivity; imported snapshots, source explanations and practice work locally. The Coding Pet has no AI, chat, microphone or speech dependency.

Preferences → Your data → Export progress creates a version 1 learning-only JSON file. On another installation, import the exact same source revision, then Import progress. Duplicates are ignored and existing drafts/notes survive. A different revision is rejected rather than applying results to changed code. The separate full-project backup includes source and drafts; replacing an existing local project requires confirmation.

## Optional local feedback and administration

1. Copy `.env.example` to `.env`. Keep it untracked.
2. Set `APP_ORIGIN` to the exact local frontend origin (for example `http://127.0.0.1:5173`). Set `COMMUNITY_STORAGE_PATH=./data/community.json` to enable local collection. Leave it empty to disable it.
3. Generate a random operator token of at least 32 characters locally, save it as `LOCAL_ADMIN_TOKEN`, and never put it in a `VITE_` variable or chat. The token is for your local admin screen, not a user password.
4. Run `node --env-file=.env server/index.mjs` beside `npm run dev`. The gateway binds to loopback by default. Vite proxies `/api` to port 8788.
5. Submit a test feedback message in Preferences. Open `/admin`, enter your local operator token, and load measured community counts. Authorization requires both the token and a loopback gateway connection. Tokens are held only in UI memory and cleared on successful loading.

Feedback accepts feature/bug/general categories, optional 1–5 rating and optional contact email. It sends only explicit form fields. Validation limits a message to 3,000 characters; per-process rate limits allow 10 submissions per IP per hour; the single-process store caps feedback at 1,000 messages. Operator maintenance/export of this private file is needed when full. Never serve `data/` as static content. The file store is intentionally for one gateway process, not shared replicas.

Anonymous activity is off by default. Explicit consent generates a random browser identifier. The server stores its hash and first/last activity dates, never source, paths, answers or account identity. Records expire after 30 inactive days. Revocation stops collection immediately and requests deletion; offline failures retry when Preferences opens online. Browser installations, registered users, active users, downloads and clones are different metrics.

After revocation the local gateway retains a hashed rejection marker for 30 days, preventing delayed collection requests from recreating the deleted activity record. This marker has no activity dates or source. The marker store is bounded; when full, collection pauses rather than dropping protection. This privacy behavior is also described in the app.

The public Sites installation serves the static frontend, not the Node gateway. When direct feedback is unavailable, Preferences offers a GitHub issue draft and copy/paste fallback. Visitors review and submit on GitHub themselves; a GitHub account is required and submitted issues are public. Only the entered category/message is included, with no contact email, source, progress or activity identifier. Long encoded messages use copy/paste without truncation. GitHub documents this flow in [Creating an issue from a URL query](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue#creating-an-issue-from-a-url-query).

This adds no server, service key, paid plan or automated issue submission. Anonymous delivery and hosted admin metrics still require a same-origin free backend with durable storage and a hard zero-spend stop. GitHub issues are managed on GitHub and are not counted in the local administrator's metrics.

## Optional Supabase identity and cloud copies

For the prepared Vercel frontend and Supabase account sequence, follow [VERCEL_SUPABASE_SETUP.md](VERCEL_SUPABASE_SETUP.md). Both accounts are uncreated as of 23 October 2026. The browser supports a modern publishable key or the legacy anon key, with build-time configuration checks.

Only use a free project with no paid upgrade/overage path. Apply migrations 001–006 in order to a staging project, then set the browser URL/anonymous key and server-only service role as described in `.env.example`. Configure Google/GitHub OAuth callbacks for your exact origin. Keep secrets out of `VITE_` variables except the intentionally public anonymous key. Cloud upload is explicit and includes source code.

Live acceptance is pending: use two accounts to verify owner isolation, TOTP, recovery, linking, sign-out, deletion and restore. Restore merges identical snapshots without replacing local drafts/notes; changed-source conflicts become separate copies. All incoming records are validated before an atomic storage commit that rejects concurrent local changes. Local progress portability is available without Supabase. Do not claim mocked tests prove deployed RLS.

## Optional GitHub App

Use repository Contents read and Metadata read only; install on selected repositories. Set the client ID/secret, exact callback and a locally generated 32-byte base64 encryption key only in the gateway environment. Keep user-token expiration enabled. All gateway replicas must use the same database and encryption key.

Migration 006 is required before running the updated gateway. Sign-in state is hashed and single-use, its PKCE verifier is encrypted, and the database expires it after ten minutes. Starting another connection invalidates the previous attempt. Access and refresh tokens are encrypted together. The gateway renews expiring grants before repository access; a database lease prevents simultaneous rotation. Disconnect removes stored credentials and pending sign-in state, and conditional writes prevent a late callback/refresh from recreating them. This removes RepoRecode's stored grant; it does not uninstall the GitHub App or revoke it at GitHub. Manage those grants in GitHub settings if desired.

If a refresh grant has expired, the user must reconnect. A gateway crash between GitHub rotation and database storage can also require reconnection; the server never guesses or falls back to a different credential. A busy refresh asks the user to retry after a bounded wait. Legacy non-expiring grants continue working; legacy expired grants without refresh tokens require one reconnection.

Local PostgreSQL tests execute the migrations and check role access, one-use state, rotation and stale-write rejection. These do not verify hosted Supabase, GitHub itself, or concurrent PostgreSQL connections. Still test denied repositories, two gateway replicas, expiry, restart and disconnect with the owner's real App. Public GitHub and ZIP/folder imports remain available without this integration.

## AI, alerts and costs

Paid model and tutor routes are removed and respond with HTTP 410 even if old AI credentials remain in the environment. No provider key is needed. Optional local Ollama explanations are permitted by the specification but are not integrated or verified yet. The pet must never become the explanation interface.

Leave external alerts disabled. Existing alert adapters are historical optional integration code and must not be enabled without verifying a genuinely free, hard-capped configuration. No purchase, billing account, payment method, paid plan or unattended paid fallback is authorized.
