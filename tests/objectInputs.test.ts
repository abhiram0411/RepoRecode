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
  it("varies every nested leaf and rejects ignoring a nested sibling", async () => {
    const s = symbol(
      "export function score(input:{stats:{count:number;active:boolean};label:string}){return input.stats.count+(input.stats.active?10:0)+input.label.length;}",
    );
    expect(s.standalone).toBe(true);
    const values = probes(s).map(
      (r) =>
        r[0] as { stats: { count: number; active: boolean }; label: string },
    );
    expect(values.length).toBeLessThanOrEqual(16);
    expect(new Set(values.map((v) => v.stats.count)).size).toBe(4);
    expect(new Set(values.map((v) => v.stats.active)).size).toBe(2);
    expect(new Set(values.map((v) => v.label)).size).toBe(4);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (
        await evaluate(
          s,
          "function score(input:{stats:{count:number;active:boolean};label:string}){return input.stats.count+input.label.length;}",
        )
      ).passed,
    ).toBe(false);
  });

  it("preserves omission and undefined at both object levels", async () => {
    const s = symbol(
      'export function read(input:{settings?:{flag?:boolean|null}}){return !("settings" in input)?1:input.settings===undefined?2:!("flag" in input.settings)?3:input.settings.flag===undefined?4:input.settings.flag===null?5:input.settings.flag?6:7;}',
    );
    expect(s.standalone).toBe(true);
    const values = probes(s).map((r) => r[0]);
    expect(values).toEqual(
      expect.arrayContaining([
        {},
        { settings: undefined },
        { settings: {} },
        { settings: { flag: undefined } },
        { settings: { flag: null } },
        { settings: { flag: false } },
        { settings: { flag: true } },
      ]),
    );
    expect(new Set(values.map(inputExpression)).size).toBe(values.length);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    expect(
      (await evaluate(s, s.code.replace('!("flag" in input.settings)?3:', "")))
        .passed,
    ).toBe(false);
  });

  it("keeps nested own __proto__ keys and constant empty objects as data", async () => {
    const s = symbol(
      'export function read(input:{"__proto__":({"__proto__":boolean});empty:{}}){return input["__proto__"]["__proto__"];}',
    );
    expect(s.standalone).toBe(true);
    const values = probes(s).map((r) => r[0] as Record<string, object>);
    expect(
      values.every(
        (v) =>
          Object.hasOwn(v, "__proto__") &&
          Object.hasOwn(v["__proto__"], "__proto__"),
      ),
    ).toBe(true);
    expect(
      values.every((v) => Object.getPrototypeOf(v) === Object.prototype),
    ).toBe(true);
    expect((await evaluate(s, s.code)).passed).toBe(true);
    const empty = symbol("export function empty(input:{a:{}}){return 1;}");
    expect(probes(empty)).toEqual([[{ a: {} }]]);
  });

  it("retains every nested domain across three parameters without exceeding 64 probes", () => {
    const shape = "{group?:{a?:boolean;b?:boolean;c?:boolean}}";
    const s = symbol(
      `export function read(x:${shape},y:${shape},z:${shape}){return x.group?.a??y.group?.b??z.group?.c??false;}`,
    );
    expect(s.standalone).toBe(true);
    const rows = probes(s);
    expect(rows.length).toBeLessThanOrEqual(64);
    for (let i = 0; i < 3; i++) {
      const values = rows.map(
        (r) => r[i] as { group?: Record<string, unknown> },
      );
      expect(values.some((v) => !Object.hasOwn(v, "group"))).toBe(true);
      expect(
        values.some((v) => Object.hasOwn(v, "group") && v.group === undefined),
      ).toBe(true);
      for (const key of ["a", "b", "c"]) {
        expect(
          values.some((v) => v.group && !Object.hasOwn(v.group, key)),
        ).toBe(true);
        for (const value of [undefined, false, true])
          expect(
            values.some(
              (v) =>
                v.group &&
                Object.hasOwn(v.group, key) &&
                v.group[key] === value,
            ),
          ).toBe(true);
      }
    }
  });

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
    "{nested:{deep:{value:number}}}",
    "{nested:{a:number;b:number};other:{c:number;d:number}}",
    "{a?:{x?:number};b?:{y?:number};c?:{z?:number}}",
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
