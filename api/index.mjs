import { createHostedHandler, hostedRoute } from "../server/hosted.mjs";

let handler;
export default async function gateway(req, res) {
  try {
    handler ??= createHostedHandler();
    req.url = hostedRoute(req);
    await handler(req, res);
  } catch {
    if (!res.headersSent) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(
        JSON.stringify({
          error:
            "Hosted service is unavailable. Your local workspace still works.",
        }),
      );
    } else if (!res.writableEnded) res.end();
  }
}
