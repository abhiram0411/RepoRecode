import { describe, it, expect } from "vitest";
// @ts-expect-error JavaScript module exposes injected delivery boundaries.
import { AlertManager, alertDelivery } from "../server/alerts.mjs";
describe("operational alerts", () => {
  it("deduplicates unchanged incidents and sends recovery once", async () => {
    const sent: unknown[] = [];
    const manager = new AlertManager({
      send: async (a: unknown) => {
        sent.push(a);
      },
    });
    await manager.evaluate("errors", true, "Errors", "bad");
    await manager.evaluate("errors", true, "Errors", "bad");
    expect(sent).toHaveLength(1);
    await manager.evaluate("errors", false, "Errors", "good");
    await manager.evaluate("errors", false, "Errors", "good");
    expect(sent).toHaveLength(2);
    expect((sent[1] as { recovered: boolean }).recovered).toBe(true);
  });
  it("does not suppress an incident when delivery fails", async () => {
    let tries = 0;
    const manager = new AlertManager({
      send: async () => {
        if (tries++ === 0) throw Error("offline");
      },
    });
    await expect(
      manager.evaluate("errors", true, "Errors", "bad"),
    ).rejects.toThrow();
    expect((await manager.evaluate("errors", true, "Errors", "bad")).sent).toBe(
      true,
    );
  });
  it("does not send without an explicitly configured destination", async () => {
    let called = false;
    await expect(
      alertDelivery({}, async () => {
        called = true;
        return new Response();
      })({ title: "Test", message: "test" }),
    ).rejects.toThrow("No alert destination");
    expect(called).toBe(false);
  });
});
