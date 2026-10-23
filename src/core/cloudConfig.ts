// Validate public build configuration without printing credential values.
export function cloudConfig(env: Record<string, unknown>) {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("VITE_") || !value) continue;
    if (
      /SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|ENCRYPTION/i.test(name) ||
      (typeof value === "string" && value.startsWith("sb_secret_"))
    )
      throw Error(
        "Server secrets must never be placed in VITE_ variables. Remove them and rotate any exposed key.",
      );
  }
  const url = String(env.VITE_SUPABASE_URL ?? "").trim();
  const legacy = String(env.VITE_SUPABASE_ANON_KEY ?? "").trim();
  const publishable = String(env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
  if (legacy && publishable && legacy !== publishable)
    throw Error(
      "Set one Supabase public key variable, not two different keys.",
    );
  const key = publishable || legacy;
  if (!url && !key) return null;
  if (!url || !key)
    throw Error(
      "Set both the Supabase project URL and its public key, or leave both empty for local mode.",
    );
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw Error("Supabase project URL is invalid.");
  }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if (
    (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  )
    throw Error(
      "Supabase requires an HTTPS project origin (HTTP is allowed only for local development).",
    );
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) {
    try {
      const parts = key.split(".");
      if (parts.length !== 3 || !parts.every((p) => /^[A-Za-z0-9_-]+$/.test(p)))
        throw Error();
      const encoded = parts[1].replaceAll("-", "+").replaceAll("_", "/");
      const payload = JSON.parse(
        atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "=")),
      );
      if (payload.role !== "anon") throw Error();
    } catch {
      throw Error(
        "Use a Supabase publishable key or legacy anon key. Secret and service-role keys are forbidden in the browser.",
      );
    }
  }
  // This checks key shape, not validity or authorization; Supabase verifies requests.
  return { url: parsed.origin, key };
}
