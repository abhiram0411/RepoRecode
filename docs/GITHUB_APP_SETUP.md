# Private repository connection — prepared setup

Prepared 28 October 2026 for the existing free RepoRecode deployment. This is separate from the working Supabase GitHub sign-in and Vercel repository installation. No GitHub App has been registered yet: the owner's GitHub settings showed “No GitHub Apps,” and registration currently requires GitHub's owner identity confirmation.

## Registration fields to review

- Suggested name: RepoRecode Learning Lab (subject to GitHub name availability).
- Homepage: https://repo-recode.vercel.app/
- Description: Read selected GitHub repositories for source-based learning in RepoRecode.
- User authorization callback: https://repo-recode.vercel.app/api/github/callback
- Expiring user authorization tokens: enabled.
- Repository permissions: Contents read-only and Metadata read-only. No write, administration, account-email or organization permissions are needed.
- Webhooks: disabled; this integration fetches on explicit user request.
- Installation availability: any GitHub account, so other RepoRecode users can choose their own repositories. Each installation should select only the intended repositories.

Review the actual registration form before saving. Creating the App does not install it, authorize a user grant or finish the backend configuration. GitHub's owner identity challenge must be completed by the owner; never paste authentication codes into chat.

## Existing backend configuration

The callback route and user-token flow are implemented in server/index.mjs and server/github.mjs. Migration 006 is already applied; do not rerun it. Vercel Production needs these server-only settings:

| Setting | Value/source |
| --- | --- |
| GITHUB_APP_CLIENT_ID | Newly registered App's client ID |
| GITHUB_APP_CLIENT_SECRET | Newly generated App client secret, transferred directly to Vercel's secret setting |
| GITHUB_CALLBACK_URL | https://repo-recode.vercel.app/api/github/callback |
| GITHUB_TOKEN_ENCRYPTION_KEY | Cryptographically random 32-byte base64 key, generated locally and stored only in the server secret store |

No App private key, installation token, personal access token or paid service is required by the implemented user-token flow. Never store secrets in source, reports, artifacts or browser-prefixed environment variables. Preserve the encryption key across replicas/redeployments; changing it makes stored grants unreadable. New settings take effect with a reviewed deployment; keep automatic Git deployments disabled and combine this with the next accepted release.

## Acceptance still required

Use an owner-approved disposable repository fixture. Verify selected-repository listing, importing at a pinned revision, denial of a repository outside the installation, reconnect/disconnect and expired-token handling. Importing private source sends that selected source through RepoRecode's Vercel gateway to the requesting browser; cloud project saving is a separate explicit action. Do not import the owner's unrelated private repositories just to test access. Disconnect removes RepoRecode's stored tokens, not the GitHub installation; manage that separately in GitHub settings.

Synthetic multi-connection refresh-lease, stale-completion, disconnect-race and one-use-state checks passed in disposable Docker PostgreSQL on 29 October. This does not verify real GitHub token rotation; live integration and the owner-deferred two-account isolation check remain separate. Stay on the current free service plans with no payment method or paid fallback.
