import { persistentAlerts } from "./alerts.mjs";
const url = process.env.APP_HEALTH_URL;
if (!url) throw Error("Set APP_HEALTH_URL to the public health endpoint.");
const target = new URL(url);
if (!["http:", "https:"].includes(target.protocol))
  throw Error("HTTP(S) health URL required.");
const alerts = await persistentAlerts();
let failures = 0;
async function check() {
  let healthy = false;
  try {
    const r = await fetch(target, {
      signal: AbortSignal.timeout(10000),
      redirect: "error",
    });
    if (r.ok) {
      const body = await r.json();
      healthy = body.status === "ok";
    }
  } catch {}
  failures = healthy ? 0 : failures + 1;
  try {
    if (healthy)
      await alerts.evaluate(
        "downtime",
        false,
        "Service availability",
        "The health endpoint is responding again.",
      );
    else if (failures >= 3)
      await alerts.evaluate(
        "downtime",
        true,
        "Service unavailable",
        "The health endpoint failed three consecutive checks.",
      );
  } catch {
    console.error("Alert delivery failed; retrying at the next check.");
  }
}
await check();
setInterval(() => void check(), 60000);
