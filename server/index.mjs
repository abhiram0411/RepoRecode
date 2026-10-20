import http from "node:http";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { persistentAlerts } from "./alerts.mjs";
import { createGithubIntegration } from "./github.mjs";
import { createGithubStore } from "./githubStore.mjs";
import { createCommunity } from "./community.mjs";

export function createGateway({
  env = process.env,
  fetcher = fetch,
  authenticate,
  deleteAccount,
} = {}) {
  const community = createCommunity(env);
  const auth =
    env.SUPABASE_URL && env.SUPABASE_ANON_KEY
      ? createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  const admin =
    env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
      ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : null;
  const github = admin
    ? createGithubIntegration({
        env,
        fetcher,
        db: createGithubStore(admin),
      })
    : null;
  const requests = [];
  let active = 0;
  const boot = Date.now();
  const server = http.createServer(async (req, res) => {
    const id = randomUUID(),
      started = Date.now();
    res.setHeader("X-Request-Id", id);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json");
    function send(status, body) {
      res.writeHead(status);
      res.end(JSON.stringify(body));
    }
    res.on("finish", () => {
      const record = {
        id,
        method: req.method,
        path: req.url?.split("?")[0],
        status: res.statusCode,
        ms: Date.now() - started,
        at: Date.now(),
      };
      requests.push(record);
      if (requests.length > 1000) requests.shift();
      if (env.NODE_ENV !== "test") console.log(JSON.stringify(record));
    });
    if (req.method === "GET" && req.url === "/api/community/status")
      return send(200, {
        feedbackEnabled: community.enabled,
        telemetryEnabled: community.enabled,
      });
    if (req.method === "GET" && req.url === "/api/health")
      return send(200, {
        status: "ok",
        aiConfigured: false,
        authConfigured: !!auth,
      });
    const route = req.url?.split("?")[0];
    if (route === "/api/github/callback" && req.method === "GET") {
      if (!github) return send(503, { error: "GitHub App not configured" });
      try {
        const url = new URL(req.url, "http://localhost");
        const destination = await github.callback(
          url.searchParams.get("code"),
          url.searchParams.get("state"),
        );
        res.writeHead(302, { Location: destination });
        return res.end();
      } catch {
        return send(400, {
          error:
            "GitHub connection failed. Restart the connection from your workspace.",
        });
      }
    }
    const methods = {
      "/api/tutor": "POST",
      "/api/lesson": "POST",
      "/api/account": "DELETE",
      "/api/admin": "GET",
      "/api/local-admin": "GET",
      "/api/feedback": "POST",
      "/api/activity": req.method === "DELETE" ? "DELETE" : "POST",
      "/api/github/connect": "GET",
      "/api/github/repositories": "GET",
      "/api/github/import": "POST",
      "/api/github/disconnect": "DELETE",
    };
    if (!methods[route]) return send(404, { error: "Not found" });
    if (req.method !== methods[route])
      return send(405, { error: "Method not allowed" });
    if (
      !env.APP_ORIGIN ||
      ((req.method !== "GET" || req.headers.origin) &&
        req.headers.origin !== env.APP_ORIGIN)
    )
      return send(403, { error: "Origin not allowed" });
    if (
      req.method !== "GET" &&
      !req.headers["content-type"]?.startsWith("application/json")
    )
      return send(415, { error: "JSON required" });
    if (["/api/feedback", "/api/activity"].includes(route))
      return community.handle(route, req, send);
    if (route === "/api/local-admin") {
      if (!community.localAdmin(req))
        return send(403, {
          error:
            "Local operator access requires a loopback connection and a configured token of at least 32 characters.",
        });
      try {
        return send(200, { community: await community.snapshot() });
      } catch {
        return send(503, { error: "Community storage unavailable" });
      }
    }
    if (["/api/tutor", "/api/lesson"].includes(route))
      return send(410, {
        error:
          "AI tutor and paid model routes are removed. Use local source explanations in the learning workspace.",
      });
    if (!auth && !authenticate)
      return send(503, {
        error:
          "Optional account services are not configured. Use the local workspace.",
      });
    const token = req.headers.authorization?.match(
      /^Bearer ([A-Za-z0-9._-]+)$/,
    )?.[1];
    if (!token) return send(401, { error: "Authentication required" });
    if (active >= 2)
      return send(429, { error: "Service busy. Try again shortly." });
    active++;
    try {
      const user = authenticate
        ? await authenticate(token)
        : (await auth.auth.getUser(token)).data.user;
      if (!user) return send(401, { error: "Invalid session" });
      if (route.startsWith("/api/github/")) {
        if (!github) return send(503, { error: "GitHub App not configured" });
        if (route === "/api/github/connect")
          return send(200, { url: await github.connect(user.id) });
        if (route === "/api/github/repositories")
          return send(200, {
            repositories: await github.repositories(user.id),
          });
        if (route === "/api/github/disconnect") {
          await github.disconnect(user.id);
          return send(200, { disconnected: true });
        }
        let raw = "",
          size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 1000) return send(413, { error: "Request too large" });
          raw += chunk;
        }
        let body;
        try {
          body = z
            .object({ repository: z.string().max(200) })
            .strict()
            .parse(JSON.parse(raw));
        } catch {
          return send(400, { error: "Invalid repository selection" });
        }
        return send(200, await github.import(user.id, body.repository));
      }
      if (route === "/api/admin") {
        let claims = {};
        try {
          claims = JSON.parse(
            Buffer.from(token.split(".")[1], "base64url").toString(),
          );
        } catch {}
        if (user.app_metadata?.role !== "admin" || claims.aal !== "aal2")
          return send(403, { error: "Administrator role and MFA required" });
        const recent = requests.filter(
            (r) => r.at > Date.now() - 15 * 60 * 1000,
          ),
          errors = recent.filter((r) => r.status >= 500).length;
        let databaseMetrics = null;
        if (admin) {
          const { data, error } = await admin.rpc("admin_snapshot");
          if (!error) databaseMetrics = data;
        }
        return send(200, {
          community: await community.snapshot(),
          databaseMetrics,
          traffic: Array.from({ length: 15 }, (_, i) => {
            const start = Date.now() - (15 - i) * 60000;
            const sample = recent.filter(
              (r) => r.at >= start && r.at < start + 60000,
            );
            return {
              minute: new Date(start).toISOString(),
              requests: sample.length,
              errors: sample.filter((r) => r.status >= 500).length,
            };
          }),
          uptimeSeconds: Math.floor((Date.now() - boot) / 1000),
          requestsInWindow: recent.length,
          windowMinutes: 15,
          windowMayBeTruncated: requests.length === 1000,
          errorCount: errors,
          averageLatencyMs: recent.length
            ? Math.round(recent.reduce((s, r) => s + r.ms, 0) / recent.length)
            : 0,
          activeRequests: active,
          authenticationFailures: recent.filter((r) => r.status === 401).length,
          authorizationFailures: recent.filter((r) => r.status === 403).length,
          infrastructureMetrics: null,
          note: "Traffic metrics belong to this process. Database aggregates require migration 005. Database CPU, memory, traffic across replicas, and billed currency spend require external infrastructure metrics.",
        });
      }
      if (route === "/api/account") {
        if (!admin && !deleteAccount)
          return send(503, {
            error: "Account administration is not configured",
          });
        let text = "",
          bytes = 0;
        for await (const chunk of req) {
          bytes += chunk.length;
          if (bytes > 1000) return send(413, { error: "Request too large" });
          text += chunk;
        }
        try {
          z.object({ confirmation: z.literal("DELETE") })
            .strict()
            .parse(JSON.parse(text));
        } catch {
          return send(400, {
            error: "Explicit deletion confirmation required",
          });
        }
        // The target is always the authenticated user, never an ID from the request body.
        if (deleteAccount) await deleteAccount(user.id);
        else {
          const { error } = await admin.auth.admin.deleteUser(user.id);
          if (error) throw error;
        }
        return send(200, { deleted: true });
      }
      return send(404, { error: "Not found" });
    } catch (e) {
      send(502, {
        error:
          e?.name === "TimeoutError"
            ? "Provider timed out"
            : "Service request failed",
      });
    } finally {
      active--;
    }
  });
  server.requestTimeout = 25000;
  server.headersTimeout = 10000;
  if (env.ALERTS_ENABLED === "true") {
    let checking = false;
    const manager = persistentAlerts(env, fetcher).catch(() => null);
    const timer = setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        const alerts = await manager;
        const recent = requests.filter(
            (r) => r.at > Date.now() - 15 * 60 * 1000,
          ),
          failures = recent.filter((r) => r.status >= 500).length;
        await alerts.evaluate(
          "api-errors",
          recent.length >= 10 && failures / recent.length >= 0.2,
          "Elevated API failures",
          `${failures} of ${recent.length} recent requests failed.`,
        );
        await alerts.evaluate(
          "auth-failures",
          recent.filter((r) => r.status === 401 || r.status === 403).length >=
            20,
          "Authentication or access failures",
          "At least 20 access denials in the recent request window.",
        );
      } catch {
        if (env.NODE_ENV !== "test")
          console.error("Operational alert delivery failed.");
      } finally {
        checking = false;
      }
    }, 60000);
    timer.unref();
    server.on("close", () => clearInterval(timer));
  }
  return server;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.PORT || 8788);
  createGateway().listen(port, process.env.HOST || "127.0.0.1", () =>
    console.log(`RepoRecode gateway listening on ${port}`),
  );
}
