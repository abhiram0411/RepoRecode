import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { dirname } from "node:path";

// Delivery is disabled unless operators configure an explicit destination.
export function alertDelivery(env = process.env, fetcher = fetch) {
  return async (alert) => {
    const text = `RepoRecode ${alert.recovered ? "recovery" : "alert"}: ${alert.title}\n${alert.message}`;
    const destinations = [];
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID)
      destinations.push(() =>
        fetcher(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            signal: AbortSignal.timeout(10000),
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text }),
          },
        ),
      );
    if (env.RESEND_API_KEY && env.ALERT_EMAIL_TO && env.ALERT_EMAIL_FROM)
      destinations.push(() =>
        fetcher("https://api.resend.com/emails", {
          method: "POST",
          signal: AbortSignal.timeout(10000),
          headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: env.ALERT_EMAIL_FROM,
            to: [env.ALERT_EMAIL_TO],
            subject: `RepoRecode: ${alert.title}`,
            text,
          }),
        }),
      );
    if (!destinations.length) throw Error("No alert destination configured");
    for (const send of destinations) {
      const r = await send();
      if (!r.ok) throw Error(`Alert delivery failed (${r.status})`);
    }
  };
}

export class AlertManager {
  constructor({ send, state = {}, save = async () => {}, now = Date.now }) {
    this.send = send;
    this.state = state;
    this.save = save;
    this.now = now;
  }
  async evaluate(key, triggered, title, message) {
    const previous = this.state[key];
    if (!triggered && !previous?.active) return { sent: false };
    if (triggered && previous?.active) return { sent: false };
    const alert = {
      key,
      title,
      message,
      recovered: !triggered,
      at: new Date(this.now()).toISOString(),
    };
    // Record transitions only after successful delivery, so failed delivery can retry.
    await this.send(alert);
    this.state[key] = { active: triggered, changedAt: alert.at };
    await this.save(this.state);
    return { sent: true, alert };
  }
}
export async function persistentAlerts(env = process.env, fetcher = fetch) {
  const file = env.ALERT_STATE_PATH || "./data/alert-state.json";
  let state = {};
  try {
    state = JSON.parse(await readFile(file, "utf8"));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  return new AlertManager({
    state,
    send: alertDelivery(env, fetcher),
    save: async (value) => {
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file + ".tmp", JSON.stringify(value));
      await rename(file + ".tmp", file);
    },
  });
}
