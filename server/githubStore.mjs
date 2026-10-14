// All mutations are database transactions. No process-local OAuth state or locks.
export function createGithubStore(client) {
  async function rpc(name, args) {
    const { data, error } = await client.rpc(name, args);
    if (error) throw Error("GitHub connection storage is unavailable.");
    return data;
  }
  return {
    async get(owner) {
      const { data, error } = await client
        .from("github_connections")
        .select("encrypted_token")
        .eq("owner_id", owner)
        .maybeSingle();
      if (error) throw Error("GitHub connection storage is unavailable.");
      return data?.encrypted_token;
    },
    begin: (owner, hash, encrypted) =>
      rpc("github_begin_connection", {
        p_owner: owner,
        p_hash: hash,
        p_pending: encrypted,
      }),
    consume: (hash) => rpc("github_consume_state", { p_hash: hash }),
    complete: (owner, hash, encrypted, login) =>
      rpc("github_complete_connection", {
        p_owner: owner,
        p_hash: hash,
        p_token: encrypted,
        p_login: login,
      }),
    claim: (owner, previous, lease) =>
      rpc("github_claim_refresh", {
        p_owner: owner,
        p_previous: previous,
        p_lease: lease,
      }),
    finish: (owner, previous, lease, encrypted) =>
      rpc("github_finish_refresh", {
        p_owner: owner,
        p_previous: previous,
        p_lease: lease,
        p_token: encrypted,
      }),
    release: (owner, previous, lease) =>
      rpc("github_release_refresh", {
        p_owner: owner,
        p_previous: previous,
        p_lease: lease,
      }),
    delete: (owner) => rpc("github_disconnect", { p_owner: owner }),
  };
}
