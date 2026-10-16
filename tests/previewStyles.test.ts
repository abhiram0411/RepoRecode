import { describe, expect, it } from "vitest";
import {
  collectPreviewStyles,
  sanitizeInlineStyle,
  sanitizeStylesheet,
} from "../src/core/previewStyles";
import { renderPreview } from "../src/core/preview";
import { createInteractivePreview } from "../src/core/interactivePreview";
import { zipImport } from "../src/core/import";
import { zipSync, strToU8 } from "fflate";
const files = [
  {
    path: "App.tsx",
    content: `import './base.css'; import {Child} from './Child'; export default function App(){return <main className="card"><Child/></main>}`,
  },
  {
    path: "Child.tsx",
    content: `import './child.css'; import {useState} from 'react'; export function Child(){const [n,setN]=useState(0);return <button className="counter" onClick={()=>setN(n+1)}>{n}</button>}`,
  },
  {
    path: "base.css",
    content:
      ":root{--ink:#123456}.card{padding:12px;color:var(--ink);display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}",
  },
  {
    path: "child.css",
    content:
      ".counter{background:rgb(20,40,60);color:white}.counter:hover{background:navy}",
  },
  { path: "unused.css", content: "body{display:none}" },
];
describe("bounded local preview styles", () => {
  it("imports CSS in real ZIP snapshots and renders only loaded styles in module order", async () => {
    const imported = zipImport(
      zipSync(
        Object.fromEntries(files.map((f) => [f.path, strToU8(f.content)])),
      ),
    );
    expect(imported).toHaveLength(5);
    const result = await renderPreview(imported, "App.tsx", "default");
    expect(result.css).toContain("--ink:#123456");
    expect(result.css).toContain("repeat(2,minmax(0,1fr))");
    expect(result.css.indexOf(".card")).toBeLessThan(
      result.css.indexOf(".counter"),
    );
    expect(result.css).not.toContain("display:none");
    expect(result.styleWarnings).toEqual([]);
    expect(result.html).toContain('class="card"');
  });
  it("keeps styles through actual interactive state updates", async () => {
    const session = await createInteractivePreview(files, "App.tsx", "default");
    try {
      const initial = session.snapshot(),
        id = /data-rr-node="(\d+)"[^>]*data-rr-events="click"/.exec(
          initial.html,
        )?.[1];
      expect(id).toBeTruthy();
      const next = session.dispatch({ type: "click", id: id! });
      expect(next.html).toContain(">1</button>");
      expect(next.css).toBe(initial.css);
    } finally {
      session.dispose();
    }
  });
  it("supports bounded media queries, gradients and inline layout/color functions", () => {
    const result = sanitizeStylesheet(
      "@media (max-width:600px){.card{display:flex;gap:clamp(2px,1vw,20px);background:linear-gradient(red,blue)}}",
    );
    expect(result.omitted).toBe(0);
    expect(result.css).toContain("@media (max-width:600px)");
    expect(sanitizeInlineStyle("color:rgb(1,2,3);width:calc(100% - 2px)")).toBe(
      "color:rgb(1,2,3);width:calc(100% - 2px)",
    );
  });
  it("removes fetching/executable rules and reports incomplete styles", () => {
    const result =
      sanitizeStylesheet(`@import 'https://evil.test/a'; @font-face{font-family:bad;src:url(https://evil.test/font)}
      .card{color:red;background:url(https://evil.test/a);cursor:url(https://evil.test/c),auto;--bad:url(https://evil.test/d);width:expression(alert(1));behavior:url(evil.htc);background-image:image-set('https://evil.test/e' 1x)}
      .card::before{content:'secret'} @keyframes spin{to{opacity:0}}`);
    expect(result.css).toBe(".card{color:red}");
    expect(result.omitted).toBe(10);
  });
  it.each([
    "background:u\\72l(https://evil.test/a)",
    "background:var(--x,url(https://evil.test/a))",
    "background:/*comment*/url(//evil.test)",
    "background:URL('data:image/svg+xml,bad')",
    "background:paint(evil)",
    "width:attr(data-secret px)",
    "--x:u\\72l(//evil.test)",
  ])("does not launder CSS values through escapes/functions (%s)", (value) => {
    expect(sanitizeStylesheet(`.card{${value};color:red}`).css).toBe(
      ".card{color:red}",
    );
    expect(sanitizeInlineStyle(value + ";color:red")).toBe("color:red");
  });
  it("cannot close the style element through quoted values", () => {
    const result = sanitizeStylesheet(
      `.card{font-family:"</style><script>alert(1)</script>";color:red}`,
    );
    expect(result.css).not.toContain("<");
    expect(result.css).toContain("color:red");
  });
  it("rejects bound plain CSS and named/namespace module imports with a clear limitation", async () => {
    for (const statement of [
      "import styles from './base.css';",
      "import {card} from './card.module.css';",
      "import * as styles from './card.module.css';",
    ]) {
      await expect(
        renderPreview(
          [
            {
              ...files[0],
              content:
                statement + "export default function App(){return <div/>}",
            },
            files[2],
            { path: "card.module.css", content: ".card{color:red}" },
          ],
          "App.tsx",
          "default",
        ),
      ).rejects.toThrow("CSS module import");
    }
  });
  it("does not reject a root just because an unrelated component uses CSS modules", async () => {
    const result = await renderPreview(
      [
        ...files,
        {
          path: "Unrelated.tsx",
          content:
            "import styles from './unrelated.module.css'; export function Unrelated(){return <p className={styles.x}/>}",
        },
      ],
      "App.tsx",
      "default",
    );
    expect(result.html).toContain('class="card"');
  });
  it("bounds CSS work and refuses forged paths", () => {
    expect(() => sanitizeStylesheet("a".repeat(128 * 1024 + 1))).toThrow(
      "128 KiB",
    );
    expect(() => sanitizeStylesheet(".a{color:red}".repeat(1001))).toThrow(
      "1,000",
    );
    expect(() => collectPreviewStyles(files, ["outside.css"])).toThrow(
      "outside",
    );
    expect(() =>
      collectPreviewStyles(files, Array(201).fill("base.css")),
    ).toThrow("list");
    expect(
      sanitizeStylesheet(
        "[data-secret^=x]{color:red}.card{&:hover{color:red}color:blue}",
      ).omitted,
    ).toBeGreaterThan(0);
  });
});
