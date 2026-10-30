# Installation and self hosting

## Device local mode

Install Node.js 24 and extract the source archive into a writable folder. Run npm ci --ignore-scripts, then npm run dev. Open the printed HTTP URL. Use the sample or import source. No login, database or API key is needed for source walkthroughs, probes and React snapshots.

Build with npm run build and serve using npm run preview. Static output is dist. Workers require HTTP or HTTPS; do not open index.html as a file. Development servers must not be exposed publicly.

## Optional backend

Copy .env.example to .env and follow SERVICE_SETUP.md. VITE_ variables are included in the browser bundle and must contain only public configuration. Rebuild after changing them. Start the backend with:

~~~sh
node --env-file=.env server/index.mjs
~~~

Vite forwards /api to port 8788 in development. Production requires a reverse proxy routing /api to the gateway on the same origin. The default static Nginx template returns 503 for /api, so it cannot silently expose an unconfigured service. Edit the reviewed deployment configuration before enabling it. Add the exact Supabase HTTPS/WSS domains to connect-src. Keep microphone access disabled. Tutor, voice and dictation features are retired.

## Containers

docker compose up --build serves static local mode on http://127.0.0.1:8080. The web container is unprivileged, read-only and capability-restricted. Stop it with docker compose down. Browser IndexedDB persists separately.

deploy/gateway.Dockerfile builds the optional Node gateway. Supply server secrets at runtime, bind it to a private network, give /app/data a writable persistent volume, and route only the documented API paths through your HTTPS proxy. Run the watchdog as a separate hosted process. Do not put repository execution into either server.

Docker Desktop is now available. The temporary native PostgreSQL runtime has been removed. Run `npm run test:postgres` to verify all migrations and concurrent database operations in a disposable PostgreSQL 17 Docker container. It uses synthetic identities, no host mounts, no database network access and temporary in-memory storage, then removes its container and data. No Supabase credentials are needed. The first run downloads the free PostgreSQL image. Results are written to `artifacts/docker-postgres-concurrency-results.json`.

Run `npm run test:docker` to build both app images, verify their local HTTP routes, unprivileged/read-only operation, source download and restart behavior, then remove the temporary containers. Add `-- --browser` to run the import, practice, persistence and preview browser journeys too (requires an installed Playwright-compatible browser). Images remain cached locally for reuse. Test ports bind only to 127.0.0.1; no cloud deployment is performed. Results are written to `artifacts/docker-app-results.json` and, when requested, `artifacts/docker-browser-results.json`.

Run `npm run test:docker-storage` to check gateway data in a disposable named volume. It checks private file permissions, persistence after replacing the container, durable activity revocation, rejected writes to read-only or damaged storage, and recovery from a synthetic saved snapshot. The container has no external network, published ports or host directory mounts. Its temporary container and volume are removed afterward; the image stays cached. Results are written to `artifacts/docker-storage-results.json`. A damaged JSON store returns a storage-unavailable response and is preserved for recovery; invalid request JSON still returns a form error. Production HTTPS proxy configuration, operator backup procedures and actual deployed volumes still require validation. The local file store supports one gateway writer; use the configured database backend for multiple instances.

## Verification

~~~sh
npm test
npm run build
npm run preview -- --port 5180
~~~

In a second terminal, set TEST_URL to http://127.0.0.1:5180 and run npx playwright test. The default browser channel is installed Microsoft Edge. For Linux use the Chromium channel and install Playwright Chromium. Unit and browser evidence is stored under artifacts.

For an automatically managed local server, leave TEST_URL unset. Set PLAYWRIGHT_DEV=true to check the development server instead of the production preview. The development regression command is `npx playwright test e2e/inherited-inputs.spec.ts e2e/generic-async-practice.spec.ts e2e/preview.spec.ts`. Set PLAYWRIGHT_BROWSER=firefox for Firefox, and keep its JSON results separate from Edge. Only install the browsers you intend to test.

## Troubleshooting

- No declarations: choose JS/TS/JSX/TSX source rather than compiled output or unsupported languages.
- Import too large: select a source subfolder. Environment files, dependencies and generated output are intentionally excluded.
- GitHub 403: public API quota may be exhausted. Use ZIP/folder or a configured App.
- Practice unavailable: external dependencies, timers/network, unsupported parameter types or standard-library APIs may need a full project harness. Locally settled promises and async/await are supported within the documented limits.
- WebAssembly magic-word error in development: use the checked-in Vite configuration, which excludes QuickJS and its binary variants from dependency prebundling. A relocated module can otherwise request a missing binary and receive an HTML page. Restart the development server after configuration changes.
- Feature mission unavailable: the reference must produce finite numeric outputs and a distinguishable transformed result.
- Preview errors: select an exported React component and supply required props as JSON. Initial mode skips effects/events. Interactive mode supports synchronous state/effects/forms; disable source inspection to use controls. Avoid unsupported packages, timers, DOM APIs and network. Errors preserve the last valid snapshot; render again to start a fresh session.
- Missing progress: different domains, ports and browser profiles have separate storage. Export before clearing site data or moving devices.
- Cloud sync fails: apply all migrations, check keys, owner RLS and exact OAuth URLs. Explicit restore merges identical snapshots, preserves drafts/notes and keeps changed-source conflicts separately. Live provider acceptance is still pending.
- Explanations: source walkthroughs run locally without an AI provider. The Coding Pet has no tutor/chat/voice mode. Optional local Ollama is not implemented.
- TOTP/admin denied: use trusted app metadata, a valid session and an MFA-verified token.

## Linked local folder

Open the Linked local folder panel in a supported browser and choose Link a local folder. The browser requests read-only access. Review the source count and press Import linked folder. Optionally enable visible-tab change checks; press Import changes to save a changed source revision as a separate project. Disconnect or reload to end the link. Your old snapshots remain.

The [directory picker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker) requires a secure context and is not supported by every browser. Ordinary folder and ZIP import remain available. Automated verification uses a synthetic directory handle; native picker permission acceptance still needs a manual check.
