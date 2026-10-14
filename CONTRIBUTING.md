# Contributing

Install Node.js 24, run `npm ci --ignore-scripts`, `npm test` and `npm run build`. For browser changes run the Playwright journey against the production build. Use small, reviewable changes and include relevant regression tests. Do not add tests that only repeat implementation details.

Before changing import/execution/authentication boundaries, update SECURITY.md and add adversarial cases. Never run imported lifecycle scripts on the server. Keep static evidence distinct from runtime observations and AI inference. Do not add sample statistics that look like real user data.

Use original or appropriately licensed assets. Preserve third-party notices. Do not contribute private repositories, keys, tokens or personal data. Changes are contributed under the project's MIT license.

Suggested initial contributions are in ROADMAP.md. The public issue tracker is not yet configured; coordinate with the project owner before starting a large change.
