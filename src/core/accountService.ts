export async function accountDeletionAvailable(signal: AbortSignal) {
  const response = await fetch("/api/health", {
    credentials: "omit",
    redirect: "error",
    cache: "no-store",
    signal,
  });
  if (!response.ok) return false;
  const data: unknown = await response.json();
  return (
    !!data &&
    typeof data === "object" &&
    "status" in data &&
    data.status === "ok" &&
    "accountDeletionConfigured" in data &&
    data.accountDeletionConfigured === true
  );
}

export async function deleteCloudAccount(accessToken: string | undefined) {
  if (!accessToken)
    throw Error("Sign in again before deleting your cloud account.");
  const response = await fetch("/api/account", {
    method: "DELETE",
    credentials: "omit",
    redirect: "error",
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ confirmation: "DELETE" }),
  });
  if (response.status === 401)
    throw Error("Sign in again before deleting your cloud account.");
  if ([404, 405, 503].includes(response.status))
    throw Error("Cloud account deletion is unavailable on this installation.");
  if (!response.ok)
    throw Error(
      "Cloud account deletion could not be confirmed. Check your account before trying again.",
    );
  // A static host may return its HTML shell with status 200 for an absent API.
  const data: unknown = await response.json().catch(() => null);
  if (
    !data ||
    typeof data !== "object" ||
    !("deleted" in data) ||
    data.deleted !== true
  )
    throw Error(
      "Cloud account deletion could not be confirmed. Check your account before trying again.",
    );
}
