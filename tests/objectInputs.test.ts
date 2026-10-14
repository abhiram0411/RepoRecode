import { describe, expect, it } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { probes, inputExpression } from "../src/core/practiceInputs";
import { functionStub } from "../src/core/functionStub";

const symbol = (code: string) =>
  analyze([{ path: "object.ts", content: code }]).symbols.find(
    (s) => s.kind === "function",
  )!;

describe("bounded inline object inputs", () => {
  it("checks independent fields and rejects implementations that ignore one", async () => {
    const s = symbol(
      "export function score(input:{count:number;enabled:boolean;label:string}){return input.count+(input.enabled?10:0)+input.label.length;}",
    );
    expect(s.standalone).toBe(true);
    const values = probes(s).map((r) => r[0] as Record<string, unknown>);
    expect(values.length).toBeLessThanOrEqual(16);
    for (const key of ["count", "enabled", "label"])
      expect(new Set(values.map((v) => v[key])).size).toBeGreaterThan(1);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          "function score(input:{count:number;enabled:boolean;label:string}){return input.count+input.label.length;}",
        )
      ).passed,
    ).toBe(false);
    expect(functionStub(s, "Try it.")).toContain(
      "input:{count:number;enabled:boolean;label:string}",
    );
  });

  it("distinguishes missing, undefined, null, false and true for optional fields", async () => {
    const s = symbol(
      'export function optional(input:{flag?:boolean|null}){return !("flag" in input)?1:input.flag===undefined?2:input.flag===null?3:input.flag?4:5;}',
    );
    const values = probes(s).map((r) => r[0]);
    expect(values).toEqual(
      expect.arrayContaining([
        {},
        { flag: undefined },
        { flag: null },
        { flag: false },
        { flag: true },
      ]),
    );
    expect(new Set(values.map(inputExpression)).size).toBe(values.length);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          "function optional(input:{flag?:boolean|null}){return input.flag===undefined?2:input.flag===null?3:input.flag?4:5;}",
        )
      ).passed,
    ).toBe(false);
  });

  it("covers each optional property domain even at all three parameter limits", () => {
    const shape = "{a?:number;b?:string;c?:boolean}";
    const s = symbol(
      `export function read(x:${shape},y:${shape},z:${shape}){return x.a??y.a??z.a??0;}`,
    );
    expect(s.standalone).toBe(true);
    const rows = probes(s);
    expect(rows.length).toBeLessThanOrEqual(64);
    for (let i = 0; i < 3; i++) {
      const values = rows.map((r) => r[i] as Record<string, unknown>);
      for (const key of ["a", "b", "c"]) {
        expect(values.some((v) => !Object.hasOwn(v, key))).toBe(true);
        expect(
          values.some((v) => Object.hasOwn(v, key) && v[key] === undefined),
        ).toBe(true);
        expect(new Set(values.map((v) => v[key])).size).toBeGreaterThan(2);
      }
    }
  });

  it("serializes quoted keys as data and preserves own __proto__ fields", async () => {
    const s = symbol(
      `export function label(input:{"__proto__":boolean;"it's ready":'yes'|'no'}){return input["__proto__"]?input["it's ready"]:'off';}`,
    );
    expect(s.standalone).toBe(true);
    expect(
      probes(s).every((r) => Object.hasOwn(r[0] as object, "__proto__")),
    ).toBe(true);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          `function label(input:{"__proto__":boolean;"it's ready":'yes'|'no'}){return 'off';}`,
        )
      ).passed,
    ).toBe(false);
    let invoked = false;
    expect(() =>
      inputExpression({
        get value() {
          invoked = true;
          return 1;
        },
      }),
    ).toThrow();
    expect(invoked).toBe(false);
  });

  it("enforces readonly fields and retains default object arguments", async () => {
    const s = symbol(
      "export function count(input:{readonly count:number}={count:7}){return input.count;}",
    );
    expect(probes(s)).toContainEqual([]);
    expect(probes(s)).toContainEqual([undefined]);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    const bad = await evaluate(
      s,
      "function count(input:{readonly count:number}={count:7}){input.count=9;return input.count;}",
    );
    expect(bad.passed).toBe(false);
    expect(bad.diagnostics.join(" ")).toContain("read-only");
  });

  it.each([
    "{nested:{value:number}}",
    "{items:number[]}",
    "{f():number}",
    "{[key:string]:number}",
    "{[Symbol.iterator]:number}",
    "{a:number;b:number;c:number;d:number}",
    "{a:1|2|3|4|5}",
    "{a:number|null}",
    "{0:number}",
    "{a:number;a:string}",
    "{a:unknown}",
    "{a:Date}",
  ])(
    "rejects the unsupported shape %s without constructing probes",
    (shape) => {
      const s = symbol(`export function f(input:${shape}){return 1;}`);
      expect(s.standalone).toBe(false);
      expect(probes(s)).toEqual([]);
    },
  );
});
