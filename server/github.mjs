import {
  randomBytes,
  randomUUID,
  createHash,
  createCipheriv,
  createDecipheriv,
} from "node:crypto";
import { allowed, LIMITS, validateFiles } from "../src/core/import.ts";
export function seal(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64"), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64");
}
export function unseal(value, key) {
  const bytes = Buffer.from(value, "base64");
  const cipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(key, "base64"),
    bytes.subarray(0, 12),
  );
  cipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([cipher.update(bytes.subarray(28)), cipher.final()]).toString(
      "utf8",
    ),
  );
}
export function createGithubIntegration({
  env,
  db,
  fetcher = fetch,
  now = Date.now,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
}) {
  const key = env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (
    !env.GITHUB_APP_CLIENT_ID ||
    !env.GITHUB_APP_CLIENT_SECRET ||
    !env.GITHUB_CALLBACK_URL ||
    !key ||
    Buffer.from(key, "base64").length !== 32
  )
    return null;
  const stateHash = (state) => createHash("sha256").update(state).digest("hex");
  const reconnect = () =>
    Error("GitHub authorization expired or changed. Reconnect your account.");
  async function exchange(fields) {
    const r = await fetcher("https://github.com/login/oauth/access_token", {
      method: "POST",
      signal: AbortSignal.timeout(20000),
      redirect: "error",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: env.GITHUB_APP_CLIENT_ID,
        client_secret: env.GITHUB_APP_CLIENT_SECRET,
        ...fields,
      }),
    });
    if (!r.ok || !r.body) throw reconnect();
    const reader = r.body.getReader(),
      chunks = [];
    let size = 0,
      data;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 16000) throw reconnect();
        chunks.push(value);
      }
      data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw reconnect();
    } finally {
      await reader.cancel().catch(() => {});
    }
    if (
      !data ||
      data.error ||
      typeof data.access_token !== "string" ||
      !data.access_token ||
      data.access_token.length > 4096
    )
      throw reconnect();
    function expiry(seconds) {
      if (seconds === undefined) return null;
      if (
        !Number.isSafeInteger(seconds) ||
        seconds <= 0 ||
        seconds > 366 * 86400
      )
        throw reconnect();
      return now() + seconds * 1000;
    }
    if (
      data.refresh_token !== undefined &&
      (typeof data.refresh_token !== "string" ||
        !data.refresh_token ||
        data.refresh_token.length > 4096)
    )
      throw reconnect();
    const result = {
      token: data.access_token,
      expiresAt: expiry(data.expires_in),
      refreshToken: data.refresh_token ?? null,
      refreshExpiresAt: expiry(data.refresh_token_expires_in),
    };
    if (
      fields.grant_type &&
      (!result.refreshToken || !result.expiresAt || !result.refreshExpiresAt)
    )
      throw reconnect();
    return result;
  }
  async function api(path, token, signal) {
    const r = await fetcher("https://api.github.com" + path, {
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(20000)])
        : AbortSignal.timeout(20000),
      redirect: "error",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
    if (!r.ok)
      throw Error(
        `GitHub request failed (${r.status}). Check the app's repository permissions.`,
      );
    return r.json();
  }
  async function tokenFor(userId) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const encrypted = await db.get(userId);
      if (!encrypted) throw Error("Connect your GitHub App account first.");
      const data = unseal(encrypted, key);
      if (!data.expiresAt || data.expiresAt > now() + 60000) return data.token;
      if (
        !data.refreshToken ||
        !data.refreshExpiresAt ||
        data.refreshExpiresAt <= now()
      )
        throw reconnect();
      const lease = randomUUID();
      if (!(await db.claim(userId, encrypted, lease))) {
        await wait(500);
        continue;
      }
      try {
        const rotated = await exchange({
          grant_type: "refresh_token",
          refresh_token: data.refreshToken,
        });
        if (!(await db.finish(userId, encrypted, lease, seal(rotated, key))))
          throw reconnect();
        return rotated.token;
      } finally {
        // Never release another request's lease or recreate a disconnected row.
        await db.release(userId, encrypted, lease);
      }
    }
    throw Error("GitHub connection is updating. Try again shortly.");
  }
  return {
    async connect(userId) {
      const state = randomBytes(32).toString("base64url"),
        verifier = randomBytes(48).toString("base64url");
      await db.begin(userId, stateHash(state), seal({ userId, verifier }, key));
      const u = new URL("https://github.com/login/oauth/authorize");
      for (const [k, v] of Object.entries({
        client_id: env.GITHUB_APP_CLIENT_ID,
        redirect_uri: env.GITHUB_CALLBACK_URL,
        state,
        code_challenge: createHash("sha256")
          .update(verifier)
          .digest("base64url"),
        code_challenge_method: "S256",
      }))
        u.searchParams.set(k, v);
      return u.href;
    },
    async callback(code, state) {
      if (
        typeof state !== "string" ||
        !/^[A-Za-z0-9_-]{43}$/.test(state) ||
        typeof code !== "string" ||
        !code ||
        code.length > 300
      )
        throw Error("Invalid or expired GitHub connection state.");
      const hash = stateHash(state),
        pending = await db.consume(hash);
      if (!pending) throw Error("Invalid or expired GitHub connection state.");
      const s = unseal(pending, key);
      const data = await exchange({
        code,
        redirect_uri: env.GITHUB_CALLBACK_URL,
        code_verifier: s.verifier,
      });
      const profile = await api("/user", data.token);
      if (
        typeof profile.login !== "string" ||
        !/^[A-Za-z0-9-]{1,100}$/.test(profile.login)
      )
        throw reconnect();
      if (!(await db.complete(s.userId, hash, seal(data, key), profile.login)))
        throw reconnect();
      return env.APP_ORIGIN + "/?github=connected";
    },
    async repositories(userId) {
      const deadline = AbortSignal.timeout(45000);
      const token = await tokenFor(userId),
        installations = await api(
          "/user/installations?per_page=100",
          token,
          deadline,
        );
      const repos = [];
      for (const i of installations.installations ?? []) {
        if (repos.length >= 200) break;
        const data = await api(
          `/user/installations/${i.id}/repositories?per_page=100`,
          token,
          deadline,
        );
        for (const r of data.repositories ?? [])
          repos.push({
            id: r.id,
            name: r.full_name,
            private: r.private,
            installationId: i.id,
          });
      }
      return repos.slice(0, 200);
    },
    async import(userId, fullName) {
      const deadline = AbortSignal.timeout(60000);
      if (!/^[\w.-]+\/[\w.-]+$/.test(fullName))
        throw Error("Invalid repository name.");
      const token = await tokenFor(userId);
      const base = "/repos/" + fullName;
      const meta = await api(base, token, deadline);
      const commit = await api(
        base + "/commits/" + encodeURIComponent(meta.default_branch),
        token,
        deadline,
      );
      const tree = await api(
        base + "/git/trees/" + commit.sha + "?recursive=1",
        token,
        deadline,
      );
      if (tree.truncated)
        throw Error("Repository is too large. Import a source subfolder.");
      const selected = tree.tree.filter(
        (f) => f.type === "blob" && f.mode !== "120000" && allowed(f.path),
      );
      if (
        selected.length > LIMITS.files ||
        selected.some((f) => f.size > LIMITS.fileBytes) ||
        selected.reduce((s, f) => s + f.size, 0) > LIMITS.totalBytes
      )
        throw Error("Repository exceeds import limits.");
      const files = [];
      for (const f of selected) {
        const blob = await api(base + "/git/blobs/" + f.sha, token, deadline);
        if (blob.encoding !== "base64" || blob.size > LIMITS.fileBytes)
          throw Error("Unsupported blob.");
        files.push({
          path: f.path,
          content: Buffer.from(blob.content, "base64").toString("utf8"),
        });
      }
      return {
        name: fullName,
        origin: `https://github.com/${fullName}/tree/${commit.sha}`,
        files: validateFiles(files),
      };
    },
    async disconnect(userId) {
      await db.delete(userId);
    },
  };
}
