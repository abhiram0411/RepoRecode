import { it, expect } from "vitest";
import { analyze } from "../src/core/analyze";
import {
  evaluateComponent,
  componentCases,
} from "../src/core/componentPractice";
const files = [
  {
    path: "Card.tsx",
    content:
      "export function Card({count,label}:{count:number;label:string}) { return <p title={label}>{count * 2}</p>; }",
  },
];
const symbol = analyze(files).symbols[0];
it("accepts equivalent component implementation across real isolated prop renders", async () => {
  const result = await evaluateComponent(
    files,
    symbol,
    "function Card({count,label}:{count:number;label:string}) { const value = count + count; return <p title={label}>{value}</p>; }",
  );
  expect(result.passed).toBe(true);
  expect(result.cases.length).toBeGreaterThan(2);
  expect(result.note).toContain("initial-render");
});
it("rejects a component that hardcodes the first example", async () => {
  const result = await evaluateComponent(
    files,
    symbol,
    "function Card({label}:{label:string}) { return <p title={label}>{0}</p>; }",
  );
  expect(result.supported).toBe(true);
  expect(result.passed).toBe(false);
  expect(result.cases.some((c) => !c.passed)).toBe(true);
});
it("reports unsupported callback props without claiming a learner failure", async () => {
  const f = [
      {
        path: "App.tsx",
        content:
          "export function App({onClick}:{onClick:()=>void}) { return <button onClick={onClick}>Go</button>; }",
      },
    ],
    s = analyze(f).symbols[0];
  const result = await evaluateComponent(f, s, s.code);
  expect(result.supported).toBe(false);
  expect(result.passed).toBe(false);
});
it("bounds samples and accepts local interface props", () => {
  const f = [
      {
        path: "App.tsx",
        content:
          'interface Props {active:boolean;title:string} export function App(p:Props){return <p>{p.active ? p.title : "Off"}</p>}',
      },
    ],
    s = analyze(f).symbols.find((s) => s.name === "App")!;
  expect(componentCases(f, s).length).toBeLessThanOrEqual(6);
});
it("rejects extra top-level declarations and contains a runaway draft", async () => {
  expect(
    (
      await evaluateComponent(
        files,
        symbol,
        "function Card(){return null;} const extra=1;",
      )
    ).passed,
  ).toBe(false);
  const result = await evaluateComponent(
    files,
    symbol,
    "function Card(){while(true){} return <p/>;}",
  );
  expect(result.passed).toBe(false);
  expect(result.cases[0].actual).toContain("interrupt");
});
