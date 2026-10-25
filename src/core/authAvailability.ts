export const supportedOAuthProviders = ["google", "github"] as const;
export type OAuthProvider = (typeof supportedOAuthProviders)[number];
export type AuthAvailability = {
  providers: OAuthProvider[];
  email: boolean;
  signup: boolean;
};

// Public Auth settings never contain client secrets or account/session data.
// https://github.com/supabase/auth/blob/master/internal/api/settings.go
export function parseAuthAvailability(raw: unknown): AuthAvailability {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw Error("Sign-in methods could not be checked.");
  const data = raw as Record<string, unknown>;
  if (
    !data.external ||
    typeof data.external !== "object" ||
    Array.isArray(data.external)
  )
    throw Error("Sign-in methods could not be checked.");
  const external = data.external as Record<string, unknown>;
  return {
    providers: supportedOAuthProviders.filter((p) => external[p] === true),
    email: external.email === true,
    signup: data.disable_signup === false,
  };
}

export async function fetchAuthAvailability(
  config: { url: string; key: string },
  signal: AbortSignal,
): Promise<AuthAvailability> {
  const response = await fetch(`${config.url}/auth/v1/settings`, {
    headers: { apikey: config.key },
    credentials: "omit",
    redirect: "error",
    signal,
  });
  if (!response.ok) throw Error("Sign-in methods could not be checked.");
  return parseAuthAvailability(await response.json());
}
