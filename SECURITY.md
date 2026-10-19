# Security policy and threat model

This development release has bounded local execution and tested access-control code. It has not received an independent security assessment. Public preview availability does not certify readiness for hostile-code, multi-tenant production workloads.

## Implemented controls

Imports use path and extension allowlists, duplicate/traversal rejection, source quotas, ZIP central-directory preflight and rejection of symlink/encrypted entries. Public GitHub imports use fixed API endpoints, disallow redirects and pin commits. Repository dependencies and lifecycle scripts are never installed.

AST, import, backup and execution workers have parent deadlines. Function probes use fresh QuickJS WASM runtimes, 8 MiB heaps, 256 KiB stacks and 75 ms deadlines per case, with a 25-second worker deadline. React initial rendering uses 48 MiB heap, 1 MiB stack, a 1-second VM deadline and a 15-second worker deadline. Neither VM receives host filesystem, network or process bridges.

React HTML is rebuilt by parse5 through tag, attribute and style allowlists. The iframe permits same-origin inspection but forbids scripts, network assets, forms and navigation through its sandbox, output sanitation and CSP. Never add allow-scripts to that iframe. Uploaded profile pictures are decoded raster formats and re-encoded into a bounded local JPEG; SVG and external URLs are rejected.

The gateway verifies bearer identity with Supabase, exact mutation Origin, method/media/schema/size limits and two-request concurrency. Administrative access requires trusted app_metadata role plus verified-token aal2. Account deletion always targets the authenticated user. Model and tutor routes are retired and return HTTP 410. Source-grounded deterministic explanations do not call external AI providers; inferred behavior is not guaranteed to match runtime behavior.

Projects/preferences use owner RLS and cascading deletion. GitHub credentials use authenticated encryption, least-privilege App grants and single-use PKCE state. Historical AI quota tables remain for compatibility but do not authorize active model requests. Optional cloud services must be operated with billing disabled and zero-spend controls. Tokens and source are omitted from logs.

## Remaining risks

- VM heap caps are not OS memory limits. Browser/QuickJS/parser/archive flaws and resource exhaustion remain possible. Obtain independent assessment and additional fuzzing before accepting adversarial production workloads.
- Finite probes skip reference failures and cannot prove general equivalence, side-effect compatibility, authorship or security.
- Local and cloud progress is client-authored. Never use it for authorization, payouts or certificates.
- Cloud migrations, OAuth, RLS, App authorization, provider quality and alert delivery have not been exercised against real accounts. Two-account acceptance is mandatory before enabling these services.
- Supabase browser tokens can be compromised by origin-level XSS. Deploy reviewed CSP/TLS and trusted assets.
- GitHub state and telemetry are process-local. Use one gateway replica or implement durable shared state. Expired App grants require reconnecting.
- Request budgets are not monetary caps. Keep optional hosted services free-only with billing disabled and a hard stop when quotas are exhausted. Authentication checks still consume upstream resources.
- Alert state is local-file durable, not a distributed incident store. Multiple delivery destinations can duplicate one successful message if another destination fails.
- Full application runtime sandboxes, comprehensive runtime tracing, infrastructure billing/CPU/memory adapters and per-device session inventory are not implemented.
- The external Google Fonts CSS import was removed from the development branch. System font stacks avoid that font-service request. Recheck all third-party network resources before production deployment.
- Terms/privacy text is marked for human/legal review. Configure real public support and security contacts before operating a production service.

## Reporting and verification

No public disclosure mailbox is configured. Report privately to the project owner through the distribution channel. Never include private source or credentials in public issues. Enable GitHub private vulnerability reporting when the repository is published.

Automated checks cover uploads, type/evaluation failures, VM loop interruption, source inspection sanitation, role/MFA denial, authenticated account ownership, token encryption, state expiry, AI output bounds and alert deduplication. See docs/VERIFICATION.md for the actual results. They are not an independent security certification.
