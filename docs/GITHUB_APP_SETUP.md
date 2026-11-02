# Private repository connection — live import verified

## 2 November — private import passed; local preview/import fixes

Production is Ready at https://repo-recode.vercel.app on commit 10051d7b0e1bac80a1dbc2ac3458ae966cdb980f, deployment BXgf4jwU2zKidcN4cuhyaqvRNUVh. Nine HTTP/source checks passed (artifacts/github-app-release-http.json). GitHub OAuth callback and repository listing passed. On 2 November, with explicit owner approval, created private abhiram0411/reporecode-private-acceptance with README and synthetic App.tsx, commit 6952df4253b552c488d22bdea741ee4a927db9c0. Added only this fixture to installation 176817799 alongside RepoRecode, preserving Contents/Metadata read-only. The live app imported one source file and indexed double/App (two declarations). No personal source uploaded; no cloud save performed. Fixture and local imported snapshot remain for follow-up; deletion was not approved. Screenshot: artifacts/github-private-import-passed.png.

Fixed a reproducible preview readiness race locally: newly painted snapshots were clickable before their deferred trusted bridge loaded. Body starts inert and the bridge enables it after installing handlers, before restoring focus. Delaying bridge delivery 350 ms reproduced the failure on production; three local development repeats and all four Edge production-preview/isolation journeys passed. This preserves the opaque iframe and strict script policy. GitHub oversized/truncated imports now return a safe HTTP 413 with source-folder guidance instead of generic 502. Added three gateway regressions, including private provider-error redaction. No import limits increased.

Validation: build/source packaging passed; 18 focused unit tests passed. Full suite initially had one timing-sensitive generic evaluation failure during concurrent build; all 548 tests in 50 files passed with two workers after build. Receipts: artifacts/preview-readiness-before.json, preview-readiness-after.json, preview-readiness-production.json, preview-import-fixes-full-unit.json, preview-import-fixes-full-recheck.json. WebKit form/state/inspection passed; isolation initially failed at browser launch, and its separate retry passed (artifacts/preview-readiness-webkit-isolation.json). These code fixes remain LOCAL, not published/deployed. Production full RepoRecode import returned generic error and contains a 250799-byte generated source file exceeding 128 KiB; the exact server exception was not inspected, so this is a likely cause, not confirmed telemetry.

Next: publish this reviewed fix batch and verify CI, then one batched deployment when appropriate (automatic deployment stays disabled). Complete outside-installation denial/disconnect/expired-token live acceptance, owner-deferred two-account isolation, disposable-account recovery/MFA/session/deletion checks, native folder permission/manual accessibility/real Safari/low-end checks, and remaining broader learning/preview/operator scope below. Keep all services free, never delete real owner account, never push/reset the dirty root checkout; use tmp/github-v10 and preserve its .gsd/.

## Registered settings

- Suggested name: RepoRecode Learning Lab (subject to GitHub name availability).
- Homepage: https://repo-recode.vercel.app/
- Description: Read selected GitHub repositories for source-based learning in RepoRecode.
- User authorization callback: https://repo-recode.vercel.app/api/github/callback
- Expiring user authorization tokens: enabled.
- Repository permissions: Contents read-only and Metadata read-only. No write, administration, account-email or organization permissions are needed.
- Webhooks: disabled; this integration fetches on explicit user request.
- Installation availability: any GitHub account, so other RepoRecode users can choose their own repositories. Each installation should select only the intended repositories.

The owner completed GitHub identity confirmation. Registration and installation do not complete the per-user authorization callback or prove import access; those live checks remain pending. Never paste authentication codes or secrets into chat.

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
