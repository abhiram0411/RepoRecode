# API inventory

The optional Node gateway defaults to port 8788. Frontend calls use the same-origin /api prefix. Every protected endpoint verifies the bearer token with Supabase. Mutation requests require application/json and an exact APP_ORIGIN match. GET requests with an Origin header also require a match.

| Method and path | Extra authorization | Behavior |
| --- | --- | --- |
| GET /api/health | None | Status and configured-service booleans |
| POST /api/tutor | Retired | HTTP 410; no provider request |
| POST /api/lesson | Retired | HTTP 410; no provider request |
| GET /api/community/status | None | Whether local feedback/activity collection is configured |
| POST /api/feedback | Anonymous, exact origin and bounded rate | Validated feedback, optional rating/contact, local store |
| POST /api/activity | Explicit consent in UI, exact origin | Record hashed installation activity by day |
| DELETE /api/activity | Exact origin and installation identifier | Delete activity and retain a bounded 30-day rejection marker |
| GET /api/local-admin | Loopback plus local operator bearer token | Measured local community counts and recent feedback |
| GET /api/github/connect | Signed in | One-time GitHub App authorization URL |
| GET /api/github/callback | Expiring one-time state and PKCE | Exchange code, encrypt token, redirect to APP_ORIGIN |
| GET /api/github/repositories | Signed in and connected App | Bounded authorized repository picker |
| POST /api/github/import | Same | Repository name to immutable source snapshot |
| DELETE /api/github/disconnect | Signed in | Atomically remove stored credentials and pending sign-in state; reject stale callback/refresh writes |
| DELETE /api/account | Signed in and typed DELETE confirmation | Delete only authenticated account |
| GET /api/admin | Trusted app_metadata role admin and aal2 | Process metrics and optional database aggregates |

Unknown paths return 404; wrong methods 405. Common errors: 400 invalid schema, 401 session absent/invalid, 403 origin/role/MFA denied, 413 size limit, 415 media type, 429 concurrency/quota, 502 upstream failure, 503 missing service/accounting.

Tutor and model-generated lesson routes were retired under the free-only specification. Historical lesson schemas and database quota tables are not active provider features. Feedback fields are category, message, optional rating/contact and an empty honeypot; the body is bounded to 16,000 bytes, message to 3,000 characters and durable feedback to 1,000 records. Activity sends only a UUID installation identifier. Revoked identifiers cannot recreate activity during their rejection-marker lifetime. See SERVICE_SETUP.md for local storage and privacy details.

GitHub import accepts only repository in owner/name form. Account deletion accepts only confirmation set to DELETE; caller-supplied target IDs are rejected. Cloud project/preferences CRUD occurs through Supabase with owner RLS, not arbitrary service-role endpoints.

GitHub routes require migration 006. Connect stores encrypted PKCE state before returning a URL. Callback consumes its hashed state once and saves only if the attempt is still current. Repository listing/import renew an expiring grant through a shared database lease and store both rotated tokens encrypted. Busy renewal asks for retry; expired/missing refresh grants ask for reconnection. GitHub uninstall/revocation is managed separately on GitHub.

Gateway JSON logs retain only request ID, method, canonical path, status, timing and timestamp. No tokens, prompts, source or query string. The process ring holds 1000 requests. Deployment operators must configure durable log retention if needed.

The server never installs or runs a repository. Browser code analysis, evaluation, backup validation and preview use disposable workers with parent deadlines. The public static host does not expose this optional Node gateway.
