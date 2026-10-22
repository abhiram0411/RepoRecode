import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { randomUUID, createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const feedbackSchema = z
  .object({
    category: z.enum(["feature", "bug", "general"]),
    message: z.string().trim().min(10).max(3000),
    rating: z.number().int().min(1).max(5).optional(),
    contact: z.string().email().max(254).optional(),
    website: z.literal("").optional(),
  })
  .strict();
const activitySchema = z
  .object({
    installationId: z.string().uuid(),
    event: z.enum(["installation", "active"]),
  })
  .strict();
const deletionSchema = z.object({ installationId: z.string().uuid() }).strict();
export function createCommunity(env) {
  const path = env.COMMUNITY_STORAGE_PATH
    ? resolve(env.COMMUNITY_STORAGE_PATH)
    : null;
  let queue = Promise.resolve();
  const limits = new Map();
  const enabled = !!path;
  const hash = (id) => createHash("sha256").update(id).digest("hex");
  async function mutate(fn) {
    const operation = queue.then(async () => {
      let data = { feedback: [], installations: {}, revoked: {} };
      try {
        const text = await readFile(path, "utf8");
        if (text.length > 8 * 1024 * 1024) throw Error("Store size limit");
        data = JSON.parse(text);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      const cutoff = new Date(Date.now() - 30 * 86400000)
        .toISOString()
        .slice(0, 10);
      for (const [id, row] of Object.entries(data.installations))
        if (row.lastSeen < cutoff) delete data.installations[id];
      data.revoked ??= {};
      for (const [id, expires] of Object.entries(data.revoked))
        if (expires <= Date.now()) delete data.revoked[id];
      const result = fn(data);
      await mkdir(dirname(path), { recursive: true });
      const tmp = path + ".tmp";
      await writeFile(tmp, JSON.stringify(data), { mode: 0o600 });
      await rename(tmp, path);
      return result;
    });
    queue = operation.catch(() => {});
    return operation;
  }
  function allowed(ip) {
    const hour = Math.floor(Date.now() / 3600000);
    for (const [key, value] of limits)
      if (value.hour !== hour) limits.delete(key);
    if (limits.size >= 2000 && !limits.has(ip)) return false;
    const row = limits.get(ip) ?? { hour, count: 0 };
    row.count++;
    limits.set(ip, row);
    return row.count <= 10;
  }
  async function body(req) {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > 16000)
        throw Object.assign(Error("Request too large"), { statusCode: 413 });
      chunks.push(bytes);
    }
    let decoded;
    try {
      decoded = new TextDecoder("utf-8", { fatal: true }).decode(
        Buffer.concat(chunks, size),
      );
    } catch {
      throw Object.assign(Error("Invalid UTF-8"), { statusCode: 400 });
    }
    return JSON.parse(decoded);
  }
  async function handle(route, req, send) {
    if (!enabled)
      return send(503, {
        error:
          "Feedback and anonymous activity collection are not configured on this installation.",
      });
    if (
      req.method !== "DELETE" &&
      !allowed(req.socket.remoteAddress ?? "unknown")
    )
      return send(429, {
        error: "Submission limit reached. Try again in an hour.",
      });
    try {
      const raw = await body(req);
      if (route === "/api/feedback") {
        const value = feedbackSchema.parse(raw);
        const id = await mutate((data) => {
          if (data.feedback.length >= 1000)
            throw Error("Feedback storage is full");
          const id = randomUUID();
          data.feedback.push({
            id,
            at: new Date().toISOString(),
            ...value,
            website: undefined,
          });
          return id;
        });
        return send(201, { id, received: true });
      }
      if (req.method === "DELETE") {
        const { installationId } = deletionSchema.parse(raw);
        await mutate((data) => {
          const id = hash(installationId);
          delete data.installations[id];
          const expires = Date.now() + 30 * 86400000;
          // Keep a bounded rejection marker so delayed POSTs cannot resurrect a revoked record.
          // If markers fill up, fail closed for collection rather than losing a revocation.
          if (data.revoked[id] || Object.keys(data.revoked).length < 10000)
            data.revoked[id] = expires;
          else data.collectionPausedUntil = expires;
        });
        return send(200, { deleted: true });
      }
      const { installationId } = activitySchema.parse(raw),
        id = hash(installationId);
      const recorded = await mutate((data) => {
        if (data.revoked[id] || data.collectionPausedUntil > Date.now())
          return false;
        const day = new Date().toISOString().slice(0, 10);
        if (
          !data.installations[id] &&
          Object.keys(data.installations).length >= 10000
        )
          throw Error("Activity storage is full");
        data.installations[id] = {
          firstSeen: data.installations[id]?.firstSeen ?? day,
          lastSeen: day,
        };
        return true;
      });
      if (!recorded)
        return send(409, {
          error:
            "Activity consent was revoked or collection is temporarily paused. No activity was stored.",
        });
      return send(202, { recorded: true });
    } catch (e) {
      const badInput =
        e instanceof z.ZodError ||
        e instanceof SyntaxError ||
        e?.statusCode === 400;
      return send(e?.statusCode === 413 ? 413 : badInput ? 400 : 503, {
        error:
          e?.statusCode === 413
            ? "Request too large."
            : badInput
              ? "Invalid submission. Check the form fields."
              : "Submission could not be stored. Please try later.",
      });
    }
  }
  async function snapshot() {
    if (!enabled) return null;
    return mutate((data) => {
      const feedback = data.feedback,
        rated = feedback.filter((f) => Number.isInteger(f.rating));
      const week = new Date(Date.now() - 7 * 86400000)
        .toISOString()
        .slice(0, 10);
      return {
        feedbackCount: feedback.length,
        featureRequests: feedback.filter((f) => f.category === "feature")
          .length,
        bugReports: feedback.filter((f) => f.category === "bug").length,
        averageRating: rated.length
          ? rated.reduce((n, f) => n + f.rating, 0) / rated.length
          : null,
        ratingCount: rated.length,
        retainedOptInInstallations: Object.keys(data.installations).length,
        activeOptInInstallationsLastSevenDays: Object.values(
          data.installations,
        ).filter((i) => i.lastSeen >= week).length,
        feedback: feedback.slice(-100).reverse(),
        measuredAt: new Date().toISOString(),
        githubStars: null,
        githubClones: null,
        releaseDownloads: null,
        note: "Opt-in browser installations only, retained for 30 days since last activity; these are not people or download counts. GitHub metrics are unavailable until a public repository is connected.",
      };
    });
  }
  function localAdmin(req) {
    const expected = env.LOCAL_ADMIN_TOKEN;
    if (
      !expected ||
      expected.length < 32 ||
      !["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(
        req.socket.remoteAddress,
      )
    )
      return false;
    const actual = req.headers.authorization?.replace(/^Bearer /, "") ?? "";
    const a = Buffer.from(actual),
      b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
  return { enabled, handle, snapshot, localAdmin };
}
