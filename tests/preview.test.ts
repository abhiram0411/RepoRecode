import { describe, it, expect } from "vitest";
import { renderPreview, sanitizePreview } from "../src/core/preview";
import { demoFiles } from "../src/core/demo";
import { analyze } from "../src/core/analyze";
describe("isolated React rendering", () => {
  it("applies a function draft to an exported arrow without corrupting surrounding code or source locations", async () => {
    const files = [
      {
        path: "App.tsx",
        content:
          "export const double = (n: number) => n * 2;\nexport default function App(){ return <p>{double(3)}</p>; }",
      },
    ];
    const symbol = analyze(files).symbols.find((s) => s.name === "double")!;
    const r = await renderPreview(
      files,
      "App.tsx",
      "default",
      {},
      { symbol, code: "function double(n:number){\nreturn n * 3;\n}" },
    );
    expect(r.html).toContain(">9</p>");
    expect(r.html).toContain('data-rr-line="2"');
    expect(files[0].content).toContain("n * 2");
  });
  it("renders real React source with hooks and imported components", async () => {
    const result = await renderPreview(demoFiles, "src/App.tsx", "default");
    expect(result.html).toContain("Trail journal");
    expect(result.html).toContain("Ridge loop");
    expect(result.html).toContain("0% complete");
    expect(result.html).toContain(
      'data-rr-file="src/components/TrailCard.tsx"',
    );
  });
  it("rejects network and host APIs", async () => {
    await expect(
      renderPreview(
        [
          {
            path: "App.tsx",
            content:
              'export default function App(){fetch("https://example.com");return <div/>;}',
          },
        ],
        "App.tsx",
        "default",
      ),
    ).rejects.toThrow("fetch");
  });
  it("interrupts infinite render loops", async () => {
    await expect(
      renderPreview(
        [
          {
            path: "App.tsx",
            content:
              "export default function App(){while(true){} return <div/>;}",
          },
        ],
        "App.tsx",
        "default",
      ),
    ).rejects.toThrow("interrupted");
  }, 5000);
  it("removes executable tags and every network or navigation attribute", () => {
    const html = sanitizePreview(
      '<script>alert(1)</script><img src="https://evil.test/a"><a href="https://evil.test">link</a><div onclick="bad()" style="background:url(https://evil.test);color:red">ok</div><iframe src="https://evil.test"></iframe>',
    );
    expect(html).not.toContain("evil.test");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("<script");
    expect(html).toContain("color:red");
  });
});
