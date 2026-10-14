import { useState } from "react";
import { cloud } from "../core/cloud";
import type { SourceFile } from "../core/types";
export default function GithubRepositories({
  onImport,
}: {
  onImport: (
    files: SourceFile[],
    name: string,
    origin: string,
  ) => Promise<void>;
}) {
  const [repos, setRepos] = useState<
      { name: string; private: boolean; id: number }[]
    >([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function api(path: string, body?: unknown, method?: string) {
    if (!cloud)
      throw Error("Cloud sign-in and the GitHub App must be configured first.");
    const {
      data: { session },
    } = await cloud.auth.getSession();
    if (!session)
      throw Error(
        "Sign in first. GitHub repository grants are separate from sign-in.",
      );
    const r = await fetch("/api/github/" + path, {
      method: method ?? (body ? "POST" : "GET"),
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(body || method === "DELETE"
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error ?? "GitHub request failed.");
    return data;
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="connected-repos">
      <h3>Authorized GitHub repositories</h3>
      <p>
        Connect the RepoRecode GitHub App with read access to selected
        repositories. Private source passes through your configured backend for
        import.
      </p>
      <div className="button-row">
        <button
          className="secondary"
          disabled={busy || !cloud}
          onClick={() =>
            void action(async () => {
              const data = await api("connect");
              window.location.assign(data.url);
            })
          }
        >
          Connect GitHub App
        </button>
        <button
          className="secondary"
          disabled={busy || !cloud}
          onClick={() =>
            void action(async () => {
              const data = await api("repositories");
              setRepos(data.repositories);
              if (!data.repositories.length)
                setMessage(
                  "No repositories are authorized. Check your GitHub App installation.",
                );
            })
          }
        >
          Load repositories
        </button>
        <button
          className="text-button"
          disabled={busy || !cloud}
          onClick={() =>
            void action(async () => {
              await api("disconnect", undefined, "DELETE");
              setRepos([]);
              setMessage(
                "Stored GitHub credentials removed. You can revoke the app grant in GitHub settings.",
              );
            })
          }
        >
          Disconnect
        </button>
      </div>
      {repos.map((r) => (
        <button
          className="repo-option"
          key={r.id}
          disabled={busy}
          onClick={() =>
            void action(async () => {
              const p = await api("import", { repository: r.name });
              await onImport(p.files, p.name, p.origin);
            })
          }
        >
          <span>{r.name}</span>
          <small>{r.private ? "PRIVATE" : "PUBLIC"}</small>
        </button>
      ))}
      <p role="status">
        {busy
          ? "Working with GitHub…"
          : message ||
            (!cloud ? "Available after account and GitHub App setup." : "")}
      </p>
    </section>
  );
}
