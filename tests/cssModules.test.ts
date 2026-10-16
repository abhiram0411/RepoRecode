import { describe, it, expect } from "vitest";
import { renderPreview } from "../src/core/preview";
import { createInteractivePreview } from "../src/core/interactivePreview";
import {
  sanitizeStylesheet,
  createPreviewStyleCollector,
} from "../src/core/previewStyles";

const files = [
  {
    path: "App.tsx",
    content: `import styles from './app.module.css';import other from './other.module.css';import {useState} from 'react';export default function App(){const [n,setN]=useState(0);return <main className={styles.card} id={styles.root}><button className={styles.button} onClick={()=>setN(n+1)}>{n}</button><p className={other.card}>Other</p></main>}`,
  },
  {
    path: "app.module.css",
    content: ".card{color:red;& .button{padding:12px}}#root{display:grid}",
  },
  { path: "other.module.css", content: ".card{color:blue}" },
];
describe("bounded local CSS Modules", () => {
  it("returns exact default exports and scopes same-named classes and IDs independently", async () => {
    const result = await renderPreview(files, "App.tsx", "default");
    expect(result.html).toContain('class="rrm_1_card"');
    expect(result.html).toContain('id="rrm_1_root"');
    expect(result.html).toContain('class="rrm_2_card"');
    expect(result.css).toContain(
      ".rrm_1_card{color:red;& .rrm_1_button{padding:12px}}",
    );
    expect(result.css).toContain("#rrm_1_root{display:grid}");
    expect(result.css).toContain(".rrm_2_card{color:blue}");
    expect(result.styleWarnings).toEqual([]);
  });
  it("retains scoped CSS during real state updates", async () => {
    const session = await createInteractivePreview(files, "App.tsx", "default");
    try {
      const initial = session.snapshot();
      const id = /data-rr-node="(\d+)"[^>]*data-rr-events="click"/.exec(
        initial.html,
      )![1];
      const next = session.dispatch({ id, type: "click" });
      expect(next.html).toContain(">1</button>");
      expect(next.html).toContain('class="rrm_1_button"');
      expect(next.css).toBe(initial.css);
    } finally {
      session.dispose();
    }
  });
  it("treats prototype-like class names as own inert strings, without fabricated exports", async () => {
    const result = await renderPreview(
      [
        {
          path: "App.tsx",
          content: `import s from './x.module.css';export default function App(){return <p className={s.__proto__+' '+s.constructor+' '+s.__esModule}>{Object.getPrototypeOf(s)===null?'null':'bad'}:{Object.keys(s).length}:{String(s.missing)}</p>}`,
        },
        {
          path: "x.module.css",
          content:
            ".__proto__{color:red}.constructor{color:blue}.__esModule{display:block}",
        },
      ],
      "App.tsx",
      "default",
    );
    expect(result.html).toContain(
      'class="rrm_1___proto__ rrm_1_constructor rrm_1___esModule"',
    );
    expect(result.html).toContain("null:3:undefined");
  });
  it("keeps fetching and unsupported module constructs excluded with omission notices", () => {
    const result = sanitizeStylesheet(
      ".card{color:red;composes:other;background:url(https://evil.test)}:global(.outside){color:blue}@value x: red;",
      "rrm_1_",
    );
    expect(result.css).toBe(".rrm_1_card{color:red}");
    expect(result.classes).toEqual({ card: "rrm_1_card" });
    expect(result.omitted).toBe(4);
  });
  it("bounds local names and rejects invalid scope input", () => {
    expect(() => sanitizeStylesheet(".a{color:red}", "unsafe")).toThrow(
      "scope",
    );
    expect(() =>
      sanitizeStylesheet(
        Array.from({ length: 201 }, (_, i) => `.c${i}{color:red}`).join(""),
        "rrm_1_",
      ),
    ).toThrow("200 local names");
    expect(
      sanitizeStylesheet("." + "a".repeat(101) + "{color:red}", "rrm_1_")
        .omitted,
    ).toBe(1);
  });
  it("does not fail an unrelated entry for a module beyond the name limit", async () => {
    const source = [
      {
        path: "App.tsx",
        content: "export default function App(){return <p>ok</p>}",
      },
      {
        path: "unused.module.css",
        content: Array.from(
          { length: 201 },
          (_, i) => `.c${i}{color:red}`,
        ).join(""),
      },
    ];
    expect((await renderPreview(source, "App.tsx", "default")).html).toContain(
      "ok",
    );
    source[0].content = "import './unused.module.css';" + source[0].content;
    await expect(renderPreview(source, "App.tsx", "default")).rejects.toThrow(
      "200 local names",
    );
  });
  it("keeps mapping and sanitation tied to the immutable collector snapshot", () => {
    const source = [
      { path: "a.module.css", content: ".card{color:red}" },
      { path: "b.module.css", content: ".card{color:blue}" },
    ];
    const collector = createPreviewStyleCollector(source);
    source.reverse();
    source[1].content = ".changed{color:green}";
    expect(collector.collect(["a.module.css", "b.module.css"]).css).toBe(
      ".rrm_0_card{color:red}\n.rrm_1_card{color:blue}",
    );
    collector.dispose();
    expect(() => collector.collect(["a.module.css"])).toThrow("session ended");
  });
  it("uses updated CSS and export keys in a new snapshot", async () => {
    const source = [
      {
        path: "App.tsx",
        content:
          "import s from './x.module.css';export default function App(){return <p className={s.card??s.changed}>ok</p>}",
      },
      { path: "x.module.css", content: ".card{color:red}" },
    ];
    expect((await renderPreview(source, "App.tsx", "default")).css).toContain(
      ".rrm_1_card",
    );
    source[1].content = ".changed{color:blue}";
    const result = await renderPreview(source, "App.tsx", "default");
    expect(result.html).toContain('class="rrm_1_changed"');
    expect(result.css).not.toContain("rrm_1_card");
  });
});
