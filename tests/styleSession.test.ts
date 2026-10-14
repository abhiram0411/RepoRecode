import { afterEach, describe, expect, it, vi } from "vitest";
import { parse } from "css-tree";
import { createPreviewStyleCollector } from "../src/core/previewStyles";
import { createInteractivePreview } from "../src/core/interactivePreview";
vi.mock("css-tree", async (importOriginal) => {
  const actual = await importOriginal<typeof import("css-tree")>();
  return { ...actual, parse: vi.fn(actual.parse) };
});
afterEach(() => vi.clearAllMocks());

describe("preview stylesheet session", () => {
  it("parses each loaded file once, preserves changing order and never loads unrelated CSS", () => {
    const files = [
      { path: "a.css", content: ".a{color:red;background:url(//bad)}" },
      { path: "b.css", content: ".b{color:blue}" },
      { path: "unused.css", content: "body{display:none}" },
    ];
    const styles = createPreviewStyleCollector(files);
    const first = styles.collect(["a.css", "b.css"]);
    const parsed = vi.mocked(parse).mock.calls.length;
    expect(parsed).toBe(2);
    first.styleWarnings.length = 0;
    expect(
      styles.collect(["a.css", "b.css", "a.css"]).styleWarnings,
    ).toHaveLength(1);
    expect(styles.collect(["b.css", "a.css"]).css).toBe(
      ".b{color:blue}\n.a{color:red}",
    );
    expect(styles.collect([]).css).toBe("");
    expect(vi.mocked(parse).mock.calls.length).toBe(parsed);
    expect(() => styles.collect(["a.css", "outside.css"])).toThrow(
      "outside the imported snapshot",
    );
    expect(() => styles.collect(Array(201).fill("a.css"))).toThrow(
      "Invalid loaded",
    );
    styles.dispose();
    expect(() => styles.collect(["a.css"])).toThrow("session ended");
  });

  it("keeps snapshots independent and does not cache caller edits", () => {
    const files = [{ path: "a.css", content: ".a{color:red}" }];
    const old = createPreviewStyleCollector(files);
    files[0].content = ".a{color:blue}";
    const fresh = createPreviewStyleCollector(files);
    expect(old.collect(["a.css"]).css).toBe(".a{color:red}");
    expect(fresh.collect(["a.css"]).css).toBe(".a{color:blue}");
    old.dispose();
    fresh.dispose();
  });

  it("rechecks the aggregate limit after cached files and before parsing new ones", () => {
    const content = ".a{color:red}" + " ".repeat(100000);
    const files = ["a.css", "b.css", "c.css"].map((path) => ({
      path,
      content,
    }));
    const styles = createPreviewStyleCollector(files);
    styles.collect(["a.css", "b.css"]);
    expect(vi.mocked(parse).mock.calls.length).toBe(2);
    expect(() => styles.collect(files.map((f) => f.path))).toThrow("256 KiB");
    expect(vi.mocked(parse).mock.calls.length).toBe(2);
    styles.dispose();
  });

  it("does not reparse styles during actual React interaction", async () => {
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content: `import './a.css';import {useState} from 'react';export default function App(){const [n,setN]=useState(0);return <button className="a" onClick={()=>setN(n+1)}>{n}</button>}`,
        },
        { path: "a.css", content: ".a{color:red}" },
      ],
      "App.tsx",
      "default",
    );
    try {
      const initial = session.snapshot();
      const id = /data-rr-node="(\d+)"[^>]*data-rr-events="click"/.exec(
        initial.html,
      )![1];
      const parsed = vi.mocked(parse).mock.calls.length;
      expect(parsed).toBeGreaterThan(0);
      for (let n = 1; n <= 10; n++) {
        const next = session.dispatch({ id, type: "click" });
        expect(next.html).toContain(`>${n}</button>`);
        expect(next.css).toBe(initial.css);
      }
      expect(vi.mocked(parse).mock.calls.length).toBe(parsed);
    } finally {
      session.dispose();
    }
  });
});
