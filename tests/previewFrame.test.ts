import { describe, expect, it } from "vitest";
import { previewDocument, previewMessage } from "../src/core/previewFrame";

describe("preview message boundary", () => {
  const source = {} as Window;
  const data = {
    channel: "reporecode-preview",
    token: "current",
    kind: "action",
    action: { id: "node1", type: "input", value: "Ada", checked: false },
    focus: { id: "node1", start: 3, end: 3 },
  };
  const event = (override = {}) =>
    ({ source, origin: "null", data, ...override }) as MessageEvent;
  it("accepts bounded actions and locations only from the current opaque frame", () => {
    expect(previewMessage(event(), source, "current")).toMatchObject({
      kind: "action",
      action: { value: "Ada" },
    });
    expect(
      previewMessage(
        event({
          data: { ...data, kind: "select", file: "src/App.tsx", line: 2 },
        }),
        source,
        "current",
      ),
    ).toEqual({ kind: "select", file: "src/App.tsx", line: 2 });
    for (const override of [
      { source: {} },
      { origin: "https://app.test" },
      { data: { ...data, token: "previous" } },
      { data: null },
    ])
      expect(previewMessage(event(override), source, "current")).toBeNull();
    expect(previewMessage(event(), null, "current")).toBeNull();
  });
  it("rejects oversized, malformed or unsupported payloads", () => {
    for (const action of [
      { ...data.action, type: "navigate" },
      { ...data.action, value: "x".repeat(2001) },
      { ...data.action, id: "x".repeat(201) },
      { ...data.action, checked: 1 },
    ])
      expect(
        previewMessage(event({ data: { ...data, action } }), source, "current"),
      ).toBeNull();
    for (const focus of [
      undefined,
      { id: "other", start: 0, end: 0 },
      { id: "node1", start: -1, end: 2 },
      { id: "node1", start: 0, end: 3000 },
    ])
      expect(
        previewMessage(event({ data: { ...data, focus } }), source, "current"),
      ).toBeNull();
    expect(
      previewMessage(
        event({ data: { ...data, kind: "select", file: "a", line: NaN } }),
        source,
        "current",
      ),
    ).toBeNull();
  });
  it("escapes configuration and stylesheet closing tags without creating executable source", () => {
    const html = previewDocument(
      "<p>Safe snapshot</p>",
      "p{--x:</style><script>bad()</script>}",
      "nonce",
      {
        inspect: true,
        active: false,
        focus: null,
        selected: { file: '\"><script>bad()</script>', line: 1, endLine: 1 },
      },
      "https://app.test",
    );
    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html).toContain("script-src 'nonce-nonce'");
    expect(html).not.toContain("unsafe-eval");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("</style><script>bad()");
  });
});
