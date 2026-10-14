import { useEffect, useState } from "react";
import { cloud } from "../core/cloud";
import { CommunityMetrics, type CommunitySnapshot } from "./Community";
type Metrics = {
  community?: CommunitySnapshot | null;
  uptimeSeconds: number;
  requestsInWindow: number;
  windowMinutes: number;
  windowMayBeTruncated: boolean;
  errorCount: number;
  averageLatencyMs: number;
  activeRequests: number;
  dailyTutorRequests: number;
  dailyRequestCap: number;
  authenticationFailures: number;
  authorizationFailures: number;
  note: string;
  databaseMetrics?: {
    totalUsers: number;
    usersSignedInLastSevenDays: number;
    storedProjects: number;
    databaseConnections: number;
    aiRequestsToday: number;
    recordedTokensToday: number;
    usageRecordsWithoutTokenCount: number;
    measuredAt: string;
  } | null;
  traffic?: { minute: string; requests: number; errors: number }[];
};
export default function AdminPanel() {
  const [localToken, setLocalToken] = useState(""),
    [community, setCommunity] = useState<CommunitySnapshot | null>();
  const [metrics, setMetrics] = useState<Metrics>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [factor, setFactor] = useState(""),
    [code, setCode] = useState("");
  async function load() {
    setBusy(true);
    setError("");
    try {
      if (!cloud)
        throw Error(
          "Configure cloud authentication and the backend to use administration.",
        );
      const {
        data: { session },
      } = await cloud.auth.getSession();
      if (!session) throw Error("Administrator sign-in required.");
      const r = await fetch("/api/admin", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error ?? "Administration unavailable.");
      setMetrics(data);
    } catch (e) {
      setMetrics(undefined);
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
    if (cloud)
      cloud.auth.mfa
        .listFactors()
        .then(({ data }) => setFactor(data?.totp[0]?.id ?? ""));
  }, []);
  async function verify() {
    if (!cloud || !factor) return;
    const { error } = await cloud.auth.mfa.challengeAndVerify({
      factorId: factor,
      code,
    });
    if (error) setError(error.message);
    else void load();
  }
  return (
    <section className="admin-panel">
      <div className="page-heading">
        <div>
          <p className="eyebrow">AUTHORIZED OPERATIONS</p>
          <h1>Service health</h1>
          <p>
            Cloud administration requires a verified role and MFA. Local
            administration requires an operator token and a loopback connection.
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => void load()}
          disabled={busy}
        >
          Refresh metrics
        </button>
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {!cloud && (
        <form
          className="settings-card"
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            void fetch("/api/local-admin", {
              headers: { Authorization: `Bearer ${localToken}` },
              signal: AbortSignal.timeout(8000),
            })
              .then(async (r) => {
                if (
                  !r.headers.get("content-type")?.includes("application/json")
                )
                  throw Error(
                    "Local gateway unavailable. Start it with COMMUNITY_STORAGE_PATH and LOCAL_ADMIN_TOKEN configured.",
                  );
                const data = await r.json();
                if (!r.ok) throw Error(data.error);
                setCommunity(data.community);
                setLocalToken("");
              })
              .catch((e) => setError(String(e)))
              .finally(() => setBusy(false));
          }}
        >
          <h2>Local operator access</h2>
          <label>
            Local administrator token
            <input
              type="password"
              autoComplete="off"
              value={localToken}
              onChange={(e) => setLocalToken(e.target.value)}
              minLength={32}
              required
            />
          </label>
          <button className="secondary" disabled={busy}>
            Load local community metrics
          </button>
          <p className="muted">
            The token is held in memory only and cleared after a successful
            request. Registered-account counts require optional cloud
            authentication.
          </p>
        </form>
      )}
      {community !== undefined && <CommunityMetrics data={community} />}
      {factor && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
        >
          <label>
            MFA code
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
            />
          </label>
          <button className="secondary">Verify</button>
        </form>
      )}
      {metrics && (
        <>
          <CommunityMetrics data={metrics.community ?? null} />
          <div className="campaign-summary">
            <div>
              <b>{metrics.requestsInWindow}</b>
              <span>Requests in {metrics.windowMinutes} minutes</span>
            </div>
            <div>
              <b>{metrics.averageLatencyMs} ms</b>
              <span>Average response time</span>
            </div>
            <div>
              <b>{metrics.errorCount}</b>
              <span>Server errors in window</span>
            </div>
          </div>
          <div className="settings-card">
            <h2>Database measurements</h2>
            {metrics.databaseMetrics ? (
              <dl>
                {Object.entries(metrics.databaseMetrics).map(([key, value]) => (
                  <div key={key}>
                    <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p>
                Database aggregates are unavailable. Apply the metrics migration
                and configure the service role.
              </p>
            )}
            <p className="muted">
              Recent sign-ins are not a live visitor count. Legacy AI counters
              may appear in older database snapshots; AI provider routes are
              disabled.
            </p>
          </div>
          {!!metrics.traffic?.length && (
            <div className="settings-card">
              <h2>Recent request history</h2>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Minute</th>
                    <th scope="col">Requests</th>
                    <th scope="col">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.traffic.map((t) => (
                    <tr key={t.minute}>
                      <td>{new Date(t.minute).toLocaleTimeString()}</td>
                      <td>{t.requests}</td>
                      <td>{t.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="settings-card">
            <h2>Current process</h2>
            <p>Uptime: {metrics.uptimeSeconds} seconds</p>
            <p>
              Tutor budget: {metrics.dailyTutorRequests} /{" "}
              {metrics.dailyRequestCap} requests
            </p>
            <p>Authentication failures: {metrics.authenticationFailures}</p>
            <p>Authorization failures: {metrics.authorizationFailures}</p>
            <p>{metrics.note}</p>
            {metrics.windowMayBeTruncated && (
              <p>Window is limited to the most recent 1,000 requests.</p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
