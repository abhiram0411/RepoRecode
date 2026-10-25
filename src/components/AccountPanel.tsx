import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { cloud } from "../core/cloud";
import type { AuthAvailability } from "../core/authAvailability";
import MfaSettings from "./MfaSettings";
export default function AccountPanel({
  availability,
}: {
  availability: AuthAvailability | null;
}) {
  const [user, setUser] = useState<User | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!cloud) return;
    cloud.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = cloud.auth.onAuthStateChange((_e, s) =>
      setUser(s?.user ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  if (!cloud)
    return (
      <section className="settings-card">
        <h2>Account security</h2>
        <p>
          Connect Supabase to enable Google/GitHub login, account linking,
          password recovery, and session controls. The local workspace is
          available without an account.
        </p>
        <p className="muted">
          Setup instructions are included in docs/SERVICE_SETUP.md.
        </p>
      </section>
    );
  async function action(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setStatus("");
    try {
      await fn();
      setStatus(message);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const redirectTo = window.location.origin;
  const linkingEnabled = import.meta.env.VITE_AUTH_IDENTITY_LINKING === "true";
  return (
    <section className="settings-card">
      <h2>Account security</h2>
      <p role="status">{status}</p>
      {!user ? (
        <>
          {!availability?.email && (
            <p className="muted">
              Email sign-in is unavailable until this installation confirms it
              is enabled.
            </p>
          )}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <div className="button-row">
            <button
              className="secondary"
              disabled={busy || !availability?.email || !email || !password}
              onClick={() =>
                void action(async () => {
                  const { error } = await cloud!.auth.signInWithPassword({
                    email,
                    password,
                  });
                  if (error) throw error;
                }, "Signed in.")
              }
            >
              Sign in with email
            </button>
            <button
              className="secondary"
              disabled={
                busy ||
                !availability?.email ||
                !availability.signup ||
                !email ||
                password.length < 12
              }
              onClick={() =>
                void action(async () => {
                  const { error } = await cloud!.auth.signUp({
                    email,
                    password,
                    options: { emailRedirectTo: redirectTo },
                  });
                  if (error) throw error;
                }, "Check your email for confirmation if required.")
              }
            >
              Create account
            </button>
            <button
              className="text-button"
              disabled={busy || !availability?.email || !email}
              onClick={() =>
                void action(async () => {
                  const { error } = await cloud!.auth.resetPasswordForEmail(
                    email,
                    { redirectTo },
                  );
                  if (error) throw error;
                }, "If this account exists, a recovery email has been requested.")
              }
            >
              Recover account
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Signed in as {user.email}</p>
          <MfaSettings />
          <h3>Connected identities</h3>
          {user.identities?.map((i) => (
            <div className="data-row" key={i.id}>
              <span>{i.provider}</span>
              <button
                className="text-button"
                disabled={
                  busy || !linkingEnabled || (user.identities?.length ?? 0) < 2
                }
                onClick={() =>
                  void action(async () => {
                    const { error } = await cloud!.auth.unlinkIdentity(i);
                    if (error) throw error;
                    const { data } = await cloud!.auth.getUser();
                    setUser(data.user);
                  }, "Identity disconnected.")
                }
              >
                Disconnect
              </button>
            </div>
          ))}
          <div className="button-row">
            {(linkingEnabled ? (availability?.providers ?? []) : [])
              .filter((p) => !user.identities?.some((i) => i.provider === p))
              .map((provider) => (
                <button
                  key={provider}
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void action(async () => {
                      const { error } = await cloud!.auth.linkIdentity({
                        provider,
                        options: { redirectTo },
                      });
                      if (error) throw error;
                    }, "Opening identity provider…")
                  }
                >
                  Connect {provider}
                </button>
              ))}
          </div>
          {!linkingEnabled && (
            <p className="muted">
              Adding another sign-in identity is not enabled for this
              installation.
            </p>
          )}
          <label>
            New password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={12}
            />
          </label>
          <button
            className="secondary"
            disabled={busy || password.length < 12}
            onClick={() =>
              void action(async () => {
                const { error } = await cloud!.auth.updateUser({ password });
                if (error) throw error;
                setPassword("");
              }, "Password updated.")
            }
          >
            Update password
          </button>
          <div className="button-row">
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  const { error } = await cloud!.auth.signOut({
                    scope: "others",
                  });
                  if (error) throw error;
                }, "Other sessions signed out. Existing access tokens expire according to provider settings.")
              }
            >
              Sign out other devices
            </button>
            <button
              className="secondary"
              disabled={busy}
              onClick={() =>
                void action(async () => {
                  const { error } = await cloud!.auth.signOut({
                    scope: "global",
                  });
                  if (error) throw error;
                }, "All sessions signed out.")
              }
            >
              Sign out everywhere
            </button>
          </div>
          <p className="muted">
            Private GitHub repository permission is separate from sign-in.
            Account deletion requires the configured backend.
          </p>
          <button
            className="secondary danger"
            disabled={busy}
            onClick={() => {
              if (
                window.prompt(
                  "Type DELETE to permanently delete your cloud account and cloud projects.",
                ) !== "DELETE"
              )
                return;
              void action(async () => {
                const {
                  data: { session },
                } = await cloud!.auth.getSession();
                const r = await fetch("/api/account", {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${session?.access_token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ confirmation: "DELETE" }),
                });
                if (!r.ok) {
                  const data = await r.json();
                  throw Error(data.error ?? "Account deletion failed.");
                }
                await cloud!.auth.signOut({ scope: "local" });
              }, "Cloud account deleted. Local device data remains until you delete it in Your data.");
            }}
          >
            Delete cloud account
          </button>
        </>
      )}
    </section>
  );
}
