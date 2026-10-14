# Installation and self hosting

## Device local mode

Install Node.js 24 and extract the source archive into a writable folder. Run npm ci --ignore-scripts, then npm run dev. Open the printed HTTP URL. Use the sample or import source. No login, database or API key is needed for source walkthroughs, probes and React snapshots.

Build with npm run build and serve using npm run preview. Static output is dist. Workers require HTTP or HTTPS; do not open index.html as a file. Development servers must not be exposed publicly.

## Optional backend

Copy .env.example to .env and follow SERVICE_SETUP.md. VITE_ variables are included in the browser bundle and must contain only public configuration. Rebuild after changing them. Start the backend with:

~~~sh
node --env-file=.env server/index.mjs
~~~

Vite forwards /api to port 8788 in development. Production requires a reverse proxy routing /api to the gateway on the same origin. The default static Nginx template returns 503 for /api, so it cannot silently expose an unconfigured service. Edit the reviewed deployment configuration before enabling it. Add the exact Supabase HTTPS/WSS domains to connect-src. The default microphone policy disables dictation; operators enabling it can allow microphone for self after reviewing browser speech privacy.

## Containers

docker compose up --build serves static local mode on http://127.0.0.1:8080. The web container is unprivileged, read-only and capability-restricted. Stop it with docker compose down. Browser IndexedDB persists separately.

deploy/gateway.Dockerfile builds the optional Node gateway. Supply server secrets at runtime, bind it to a private network, give /app/data a writable persistent volume, and route only the documented API paths through your HTTPS proxy. Run the watchdog as a separate hosted process. Do not put repository execution into either server.

Docker engine was unavailable on this workstation. Container configuration is supplied but has not been run. Use staging to validate image build, read-only filesystem, routing and restart behavior before production.

## Verification

~~~sh
npm test
npm run build
npm run preview -- --port 5180
~~~

In a second terminal, set TEST_URL to http://127.0.0.1:5180 and run npx playwright test. The default browser channel is installed Microsoft Edge. For Linux use the Chromium channel and install Playwright Chromium. Unit and browser evidence is stored under artifacts.

## Troubleshooting

- No declarations: choose JS/TS/JSX/TSX source rather than compiled output or unsupported languages.
- Import too large: select a source subfolder. Environment files, dependencies and generated output are intentionally excluded.
- GitHub 403: public API quota may be exhausted. Use ZIP/folder or a configured App.
- Practice unavailable: dependencies, async work, unsupported parameter types or standard-library APIs may need a full project harness.
- Feature mission unavailable: the reference must produce finite numeric outputs and a distinguishable transformed result.
- Preview errors: select an exported React component and supply required props as JSON. Initial mode skips effects/events. Interactive mode supports synchronous state/effects/forms; disable source inspection to use controls. Avoid unsupported packages, timers, DOM APIs and network. Errors preserve the last valid snapshot; render again to start a fresh session.
- Missing progress: different domains, ports and browser profiles have separate storage. Export before clearing site data or moving devices.
- Cloud sync fails: apply all migrations, check keys, owner RLS and exact OAuth URLs. Restore is explicit and can replace the same local snapshot.
- AI unavailable: configure the server, sign in and consent to sharing the selected source. Static lessons still work.
- TOTP/admin denied: use trusted app metadata, a valid session and an MFA-verified token.
