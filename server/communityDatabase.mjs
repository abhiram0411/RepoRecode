import { createHash } from "node:crypto";
import { z } from "zod";
import {
  activitySchema,
  deletionSchema,
  feedbackSchema,
} from "./communitySchemas.mjs";
import { readJsonBody } from "./requestBody.mjs";

export function createDatabaseCommunity(db) {
  async function rpc(name, args) {
    const { data, error } = await db.rpc(name, args);
    if (error || data == null) throw Error("Community storage unavailable");
    return data;
  }
  async function ready() {
    try {
      return (await rpc("gateway_backend_status", {})) === 7;
    } catch {
      return false;
    }
  }
  async function handle(route, req, send) {
    try {
      const raw = await readJsonBody(req, 16000);
      let kind, key, value;
      if (route === "/api/feedback") {
        const { website: _website, ...feedback } = feedbackSchema.parse(raw);
        key = z
          .string()
          .regex(
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
          )
          .parse(req.headers["idempotency-key"]);
        kind = "feedback";
        value = feedback;
      } else {
        const data = (
          req.method === "DELETE" ? deletionSchema : activitySchema
        ).parse(raw);
        key = createHash("sha256").update(data.installationId).digest("hex");
        kind = req.method === "DELETE" ? "revoke" : "activity";
        value = {};
      }
      const result = await rpc("community_write", {
        p_kind: kind,
        p_key: key,
        p_value: value,
      });
      if (!result || ![200, 201, 202, 409, 429, 503].includes(result.status))
        throw Error("Invalid store response");
      const { status, ...body } = result;
      return send(status, body);
    } catch (error) {
      const invalid =
        error instanceof z.ZodError || error instanceof SyntaxError;
      return send(invalid ? 400 : 503, {
        error: invalid
          ? "Invalid submission. Check the form fields and submission identifier."
          : "Submission could not be stored. Please try later.",
      });
    }
  }
  return {
    enabled: true,
    ready,
    handle,
    snapshot: () => rpc("community_snapshot", {}),
    admit: async (scope) =>
      (await rpc("gateway_admit_request", { p_scope: scope })) === true,
    localAdmin: () => false,
  };
}
