import { createClient } from "@supabase/supabase-js";
import { createGatewayHandler } from "./index.mjs";
import { createDatabaseCommunity } from "./communityDatabase.mjs";

function httpsOrigin(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value;
  } catch {
    return false;
  }
}

// A separate entry point makes it impossible for hosted requests to opt into
// the local file store, loopback administration or background alert timers.
export function createHostedHandler({
  env = process.env,
  fetcher = fetch,
  db,
  authenticate,
  deleteAccount,
} = {}) {
  const publicKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const serverKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const enabled =
    env.HOSTED_BACKEND_ENABLED === "true" &&
    httpsOrigin(env.APP_ORIGIN) &&
    httpsOrigin(env.SUPABASE_URL) &&
    !!publicKey &&
    !!serverKey;
  if (!enabled)
    return createGatewayHandler({
      env: { NODE_ENV: env.NODE_ENV, APP_ORIGIN: env.APP_ORIGIN },
      hosted: true,
      communityAdapter: {
        enabled: false,
        ready: async () => false,
        snapshot: async () => null,
        localAdmin: () => false,
        handle: (_route, _req, send) =>
          send(503, {
            error: "Hosted account and community services are not configured.",
          }),
      },
    });
  const boundedFetch = (input, init = {}) =>
    fetcher(input, {
      ...init,
      redirect: "error",
      signal: AbortSignal.any([
        AbortSignal.timeout(15000),
        ...(init.signal ? [init.signal] : []),
      ]),
    });
  const admin =
    db ??
    createClient(env.SUPABASE_URL, serverKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: boundedFetch },
    });
  const community = createDatabaseCommunity(admin);
  return createGatewayHandler({
    env,
    fetcher,
    authenticate,
    deleteAccount,
    hosted: true,
    adminClient: admin,
    communityAdapter: community,
    backendReady: community.ready,
    admitRequest: community.admit,
  });
}

// Vercel rewrites related API paths to this one function. The route selects
// an endpoint only; all authorization/method/origin checks still run there.
export function hostedRoute(req) {
  const url = new URL(req.url, "https://gateway.invalid");
  const route = req.query?.route ?? url.searchParams.get("route");
  if (route == null) return req.url;
  if (
    typeof route !== "string" ||
    !/^[a-z-]+(?:\/[a-z-]+)*$/.test(route) ||
    route.length > 80
  )
    return "/api/invalid-route";
  url.searchParams.delete("route");
  return `/api/${route}${url.search}`;
}
