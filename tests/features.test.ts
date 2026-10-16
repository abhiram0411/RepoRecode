import { describe, it, expect } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { completionChallenge } from "../src/core/challenges";
import { validatePreferences } from "../src/core/preferences";
describe("expanded learning features", () => {
  const s = analyze([
    { path: "a.ts", content: "export function double(n:number){return n*2;}" },
  ]).symbols[0];
  it("makes a missing expression challenge that the original can solve", async () => {
    const code = completionChallenge(s)!;
    expect(code).toContain("Complete this expression");
    expect((await evaluate(s, code)).passed).toBe(false);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  });
  it("grades a feature change against the new contract without accepting the unchanged source", async () => {
    expect((await evaluate(s, s.code, "double-output")).passed).toBe(false);
    expect(
      (
        await evaluate(
          s,
          "function double(n:number){return n*4;}",
          "double-output",
        )
      ).passed,
    ).toBe(true);
  });
  it("does not pretend unsupported feature contracts are executable", async () => {
    const text = analyze([
      { path: "a.ts", content: "function greet(n:string){return n;}" },
    ]).symbols[0];
    expect((await evaluate(text, text.code, "double-output")).supported).toBe(
      false,
    );
  });
  it("records actual component relationships and labels architecture candidates", () => {
    const a = analyze([
      {
        path: "App.tsx",
        content:
          'import {Card} from "./Card"; export function App(){return <Card/>;}',
      },
      {
        path: "Card.tsx",
        content: 'export function Card(){fetch("/api/a");return <p>Hello</p>;}',
      },
    ]);
    expect(
      a.edges.some((e) => e.kind === "renders" && e.target.includes("#Card")),
    ).toBe(true);
    expect(
      a.facts?.some((f) => f.kind === "HTTP" && f.file === "Card.tsx"),
    ).toBe(true);
  });
  it("rejects remote and executable profile picture URLs", () => {
    const base = {
      level: "beginner",
      goal: "understand",
      theme: "dark",
      tutor: "robot",
      color: "#c5eb82",
      motion: true,
      name: "Explorer",
    };
    for (const picture of [
      "https://tracking.example/image",
      "data:image/svg+xml;base64,AAAA",
      "javascript:alert(1)",
    ])
      expect(() => validatePreferences({ ...base, picture })).toThrow();
  });
});
