import { useEffect, useState } from "react";
import { feedbackDraft, type FeedbackCategory } from "../core/feedbackDraft";
export type CommunitySnapshot = {
  feedbackCount: number;
  featureRequests: number;
  bugReports: number;
  averageRating: number | null;
  ratingCount: number;
  retainedOptInInstallations: number;
  activeOptInInstallationsLastSevenDays: number;
  feedback: {
    id: string;
    category: FeedbackCategory;
    message: string;
    rating?: number;
    contact?: string;
    at: string;
  }[];
  githubStars: number | null;
  githubClones: number | null;
  releaseDownloads: number | null;
  note: string;
};
async function api(path: string, method: string, value: unknown) {
  const r = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw Error("Feedback service is unavailable on this installation.");
  const data = await r.json();
  if (!r.ok) throw Error(data.error ?? "Request failed");
  return data;
}
const consentKey = "reporecode.activity-consent",
  idKey = "reporecode.activity-id",
  deleteKey = "reporecode.activity-delete",
  dayKey = "reporecode.activity-day";
export default function Community() {
  const [category, setCategory] = useState<FeedbackCategory>("feature"),
    [message, setMessage] = useState(""),
    [contact, setContact] = useState(""),
    [rating, setRating] = useState(""),
    [website, setWebsite] = useState("");
  const [enabled, setEnabled] = useState(false),
    [activityEnabled, setActivityEnabled] = useState(false),
    [loading, setLoading] = useState(true),
    [consent, setConsent] = useState(false),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [activityStatus, setActivityStatus] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    try {
      setConsent(localStorage.getItem(consentKey) === "yes");
    } catch {
      /* Storage may be unavailable. Collection stays off. */
    }
    void fetch("/api/community/status", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]),
    })
      .then(async (r) => {
        if (
          !r.ok ||
          !r.headers.get("content-type")?.includes("application/json")
        )
          return;
        const data = await r.json();
        setEnabled(data.feedbackEnabled === true);
        setActivityEnabled(data.telemetryEnabled === true);
        if (data.telemetryEnabled !== true) return;
        const pending = localStorage.getItem(deleteKey);
        if (pending) {
          await api("/api/activity", "DELETE", { installationId: pending });
          localStorage.removeItem(deleteKey);
          setActivityStatus("Previous activity record removed.");
        }
        const day = new Date().toISOString().slice(0, 10);
        if (
          localStorage.getItem(consentKey) === "yes" &&
          localStorage.getItem(dayKey) !== day
        ) {
          const installationId = localStorage.getItem(idKey);
          if (!installationId) return;
          await api("/api/activity", "POST", {
            installationId,
            event: "active",
          });
          localStorage.setItem(dayKey, day);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function toggle(checked: boolean) {
    setBusy(true);
    setActivityStatus("");
    try {
      if (checked) {
        if (!activityEnabled)
          throw Error("Activity service is not configured.");
        const pending = localStorage.getItem(deleteKey);
        if (pending) {
          await api("/api/activity", "DELETE", { installationId: pending });
          localStorage.removeItem(deleteKey);
        }
        const installationId = crypto.randomUUID();
        // Persist explicit consent before sending; no identifier exists by default.
        localStorage.setItem(idKey, installationId);
        localStorage.setItem(consentKey, "yes");
        setConsent(true);
        await api("/api/activity", "POST", {
          installationId,
          event: "installation",
        });
        localStorage.setItem(dayKey, new Date().toISOString().slice(0, 10));
        setActivityStatus("Anonymous activity enabled for this browser.");
      } else {
        localStorage.removeItem(consentKey);
        localStorage.removeItem(dayKey);
        setConsent(false);
        const installationId = localStorage.getItem(idKey);
        localStorage.removeItem(idKey);
        if (installationId) {
          localStorage.setItem(deleteKey, installationId);
          await api("/api/activity", "DELETE", { installationId });
          localStorage.removeItem(deleteKey);
        }
        setActivityStatus(
          "Collection stopped and this browser’s activity record removed.",
        );
      }
    } catch (e) {
      setActivityStatus(
        `${String(e)} ${checked ? "You can turn collection off at any time." : "Collection is off. A failed deletion will retry when Preferences opens online; records otherwise expire after 30 days."}`,
      );
    } finally {
      setBusy(false);
    }
  }
  const draft = feedbackDraft(category, message);
  async function copyFeedback() {
    if (!draft) return;
    try {
      await navigator.clipboard.writeText(draft.body);
      setStatus(
        "Feedback copied. Paste it into a GitHub issue and review before submitting.",
      );
    } catch {
      setStatus(
        "Clipboard access is unavailable. Select and copy your feedback text manually; it remains in this form.",
      );
    }
  }
  return (
    <section className="settings-card community-card">
      <p className="eyebrow">HELP SHAPE REPORECODE</p>
      <h2>Feedback & feature requests</h2>
      <p className="muted">
        {enabled
          ? "Send only what you write below. No source code or learning progress is attached. Contact and rating are optional; you can submit anonymously."
          : "Share a bug report or an idea through the project's GitHub issues. Only the feedback you enter is included; no source code or learning progress is attached."}
      </p>
      {loading ? (
        <p role="status">Checking feedback availability…</p>
      ) : (
        !enabled && (
          <p className="service-note">
            Direct anonymous delivery is unavailable here. GitHub requires an
            account, and submitted issues are public under your GitHub username.
            Opening a draft sends its text to GitHub for your review; it does
            not submit the issue. Keep private source, passwords and personal
            details out of public feedback.
          </p>
        )
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!enabled || busy) return;
          setBusy(true);
          setStatus("");
          void api("/api/feedback", "POST", {
            category,
            message,
            ...(contact ? { contact } : {}),
            ...(rating ? { rating: Number(rating) } : {}),
            website,
          })
            .then(() => {
              setStatus(
                "Feedback received. Thank you for helping improve RepoRecode.",
              );
              setMessage("");
              setContact("");
              setRating("");
            })
            .catch((e) => setStatus(String(e)))
            .finally(() => setBusy(false));
        }}
      >
        <label>
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value as FeedbackCategory);
              setStatus("");
            }}
          >
            <option value="feature">Feature request</option>
            <option value="bug">Bug report</option>
            <option value="general">General feedback</option>
          </select>
        </label>
        <label>
          Your feedback
          <textarea
            required
            minLength={10}
            maxLength={3000}
            rows={5}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setStatus("");
            }}
            placeholder="What would make learning from your code easier?"
          />
        </label>
        {enabled && (
          <>
            <label>
              Rating (optional)
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </label>
            <label>
              Contact email (optional)
              <input
                type="email"
                maxLength={254}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
              />
            </label>
          </>
        )}
        <label className="feedback-trap" aria-hidden="true">
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
        {enabled && (
          <button
            className="secondary"
            disabled={!enabled || busy || message.trim().length < 10}
          >
            Send feedback
          </button>
        )}
      </form>
      {!loading && !enabled && (
        <div className="public-feedback-actions">
          <button
            type="button"
            className="secondary"
            disabled={!draft}
            onClick={() => void copyFeedback()}
          >
            Copy feedback
          </button>
          {draft && (
            <a
              className="secondary"
              href={draft.url}
              target="_blank"
              rel="noreferrer"
            >
              {draft.prefilled
                ? "Review draft on GitHub"
                : "Open GitHub and paste feedback"}
            </a>
          )}
          {draft && !draft.prefilled && (
            <p className="muted">
              This message is too long for a prefilled link. Copy it first, then
              paste it into GitHub. The full text is kept.
            </p>
          )}
          <p className="muted">
            Text stays in this form while it is open. Copy it before leaving
            this page. You can also{" "}
            <a
              href="https://github.com/abhiram0411/RepoRecode/issues"
              target="_blank"
              rel="noreferrer"
            >
              browse existing issues
            </a>
            .
          </p>
        </div>
      )}
      <p role="status">{status}</p>
      <h3>Anonymous usage · off by default</h3>
      <p className="muted">
        Optionally report a random browser identifier and activity day. No code,
        file paths, answers, account identity or secrets are included. Records
        expire after 30 inactive days. Installations are browsers, not people or
        downloads.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy || (!activityEnabled && !consent)}
          onChange={(e) => void toggle(e.target.checked)}
        />
        Share anonymous activity
      </label>
      <p role="status">{activityStatus}</p>
    </section>
  );
}
export function CommunityMetrics({ data }: { data: CommunitySnapshot | null }) {
  const [category, setCategory] = useState("all");
  if (!data)
    return (
      <section className="settings-card">
        <h2>Community</h2>
        <p>
          Feedback and opt-in activity storage are not configured. No counts are
          available.
        </p>
      </section>
    );
  return (
    <section className="settings-card">
      <h2>Community</h2>
      <dl>
        {Object.entries({
          "Feedback received": data.feedbackCount,
          "Feature requests": data.featureRequests,
          "Bug reports": data.bugReports,
          "Average rating":
            data.averageRating === null
              ? "No ratings"
              : `${data.averageRating.toFixed(1)} / 5 (${data.ratingCount})`,
          "Retained opt-in installations": data.retainedOptInInstallations,
          "Active opt-in installations · 7 days":
            data.activeOptInInstallationsLastSevenDays,
          "GitHub stars": data.githubStars ?? "Unavailable",
          "GitHub clones": data.githubClones ?? "Unavailable",
          "Release downloads": data.releaseDownloads ?? "Unavailable",
        }).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="muted">{data.note}</p>
      <label>
        Filter feedback
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          <option value="feature">Feature requests</option>
          <option value="bug">Bug reports</option>
          <option value="general">General</option>
        </select>
      </label>
      {data.feedback
        .filter((f) => category === "all" || f.category === category)
        .map((f) => (
          <article className="feedback-entry" key={f.id}>
            <b>
              {f.category} · {new Date(f.at).toLocaleDateString()}
            </b>
            <p>{f.message}</p>
            {f.rating && <small>Rating: {f.rating} / 5</small>}
            {f.contact && <p>Contact: {f.contact}</p>}
          </article>
        ))}
    </section>
  );
}
