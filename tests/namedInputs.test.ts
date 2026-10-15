import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes } from "../src/core/practiceInputs";

const symbol = (content: string) =>
  analyze([{ path: "input.ts", content }]).symbols.find(
    (s) => s.kind === "function",
  )!;

describe("resolved named practice inputs", () => {
  it("retains named interface contracts, omissions and readonly checks", async () => {
    const s = symbol(
      'type Flag = boolean | null; interface Input {readonly flag?:Flag} export function read(input:Input):number{return !("flag" in input)?1:input.flag===undefined?2:input.flag===null?3:input.flag?4:5;}',
    );
    expect(s.standalone).toBe(true);
    expect(s.code).toContain("input:Input");
    expect(s.practiceTypes).toContain("readonly");
    expect(probes(s)).toEqual(
      expect.arrayContaining([
        [{}],
        [{ flag: undefined }],
        [{ flag: null }],
        [{ flag: true }],
        [{ flag: false }],
      ]),
    );
    expect((await evaluate(s, s.code)).passed).toBe(true);
    const bad = await evaluate(
      s,
      "function read(input:Input){input.flag=true;return 4;}",
    );
    expect(bad.passed).toBe(false);
    expect(bad.diagnostics.join(" ")).toContain("read-only");
  });

  it("follows renamed type imports and reexports without copying runtime dependencies", async () => {
    const analysis = analyze([
      {
        path: "types.ts",
        content: "export interface Input { count:number; enabled:boolean }",
      },
      {
        path: "barrel.ts",
        content: "export type {Input as Shape} from './types';",
      },
      {
        path: "main.ts",
        content:
          "import type {Shape as Payload} from './barrel'; export function score(input:Payload){return input.count+(input.enabled?10:0);}",
      },
    ]);
    const s = analysis.symbols.find((s) => s.name === "score")!;
    expect(s.standalone).toBe(true);
    expect(s.practiceTypes).toContain("type Payload");
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (await evaluate(s, "function score(input:Payload){return input.count;}"))
        .passed,
    ).toBe(false);
  });

  it("resolves scalar, array and tuple aliases, including defaults and return types", async () => {
    const s = symbol(
      "type Value=number; type List=ReadonlyArray<Value>; type Pair=readonly [Value,boolean]; type Result=number; export function sum(values:List,pair:Pair,scale:Value=2):Result{return values.length+pair[0]+(pair[1]?scale:0);}",
    );
    expect(s.standalone).toBe(true);
    expect(probes(s).length).toBeLessThanOrEqual(64);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          "function sum(values:List,pair:Pair,scale:Value=2):Result{return values.length+pair[0];}",
        )
      ).passed,
    ).toBe(false);
  });

  it.each([
    "type Input = Input;",
    "type Other = Input; type Input = Other;",
    "interface Input {nested:Input}",
    "interface Base {value:number} interface Input extends Base {}",
    "interface Input {a:number} interface Input {b:number}",
    "type Input<T=number> = T;",
    "type Input = {value:{nested:number}};",
    "type Input = {a:number;b:number;c:number;d:number};",
    "type Input = {method():number};",
    "class Input {value=1}",
    "type Input = Pick<{value:number},'value'>;",
  ])("rejects unresolved or unsupported declarations: %s", (declaration) => {
    const s = symbol(
      `${declaration} export function f(input:Input){return 1;}`,
    );
    expect(s.standalone).toBe(false);
    expect(probes(s)).toEqual([]);
  });

  it("does not confuse generic scope or missing imports with concrete contracts", () => {
    expect(
      symbol("type T=number; export function f<T>(x:T){return x;}").standalone,
    ).toBe(false);
    expect(
      symbol(
        "import type {Missing} from './missing'; export function f(x:Missing){return x;}",
      ).standalone,
    ).toBe(false);
  });

  it("rejects deep alias chains and oversized expansions", () => {
    const chain = Array.from(
      { length: 12 },
      (_, i) => `type A${i}=A${i + 1};`,
    ).join("");
    expect(
      symbol(`${chain}type A12=number;export function f(x:A0){return x;}`)
        .standalone,
    ).toBe(false);
  });

  it("recomputes changed imported contracts instead of retaining an old alias", async () => {
    const { createAnalyzer } = await import("../src/core/analyze");
    const index = createAnalyzer();
    const fn = {
      path: "main.ts",
      content:
        "import type {Input} from './types'; export function read(x:Input){return x;}",
    };
    const first = index([
      { path: "types.ts", content: "export type Input=boolean;" },
      fn,
    ]);
    const second = index([
      { path: "types.ts", content: "export type Input='yes'|'no';" },
      fn,
    ]);
    expect(second.reusedFiles).toBe(1);
    expect(
      probes(first.analysis.symbols.find((s) => s.name === "read")!),
    ).toEqual([[false], [true]]);
    expect(
      probes(second.analysis.symbols.find((s) => s.name === "read")!),
    ).toEqual([["yes"], ["no"]]);
  });

  it("never executes executable text injected into stored type context", async () => {
    const s = symbol("export function f(x:number){return x;}");
    s.practiceTypes = "throw new Error('should not run');";
    const result = await evaluate(s, s.code);
    expect(result.supported).toBe(false);
    expect(result.diagnostics.join(" ")).toContain("only type aliases");
  });
});
