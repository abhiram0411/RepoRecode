import { expect, it } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { predictionMatches, predictionSupported } from "../src/core/prediction";

async function cases(code: string) {
  const s = analyze([{ path: "a.ts", content: code }]).symbols[0];
  const result = await evaluate(s, s.code);
  expect(result.passed).toBe(true);
  return result.cases;
}

it("accepts reordered nested object answers while preserving array order and types", async () => {
  const [value] = await cases('function f(){return {b:[1,"2"],a:{yes:true}};}');
  expect(
    predictionMatches('{"a":{"yes":true},"b":[1,"2"]}', value.expectedKey),
  ).toBe(true);
  expect(
    predictionMatches('{"a":{"yes":true},"b":["2",1]}', value.expectedKey),
  ).toBe(false);
  expect(
    predictionMatches('{"a":{"yes":true},"b":[1,2]}', value.expectedKey),
  ).toBe(false);
});

it.each(["undefined", "NaN", "Infinity", "-Infinity"])(
  "accepts the literal %s without confusing it with a string or null",
  async (literal) => {
    const [value] = await cases(`function f(){return ${literal};}`);
    expect(predictionMatches(literal, value.expectedKey)).toBe(true);
    expect(predictionMatches(JSON.stringify(literal), value.expectedKey)).toBe(
      false,
    );
    expect(predictionMatches("null", value.expectedKey)).toBe(false);
  },
);

it("does not offer lossy compound-output challenges that JSON cannot express", async () => {
  for (const expression of [
    "{value:undefined}",
    "[undefined]",
    "[NaN]",
    "[,1]",
    "{value:Infinity}",
  ]) {
    const [value] = await cases(`function f(){return ${expression};}`);
    expect(predictionSupported(value.expectedKey)).toBe(false);
    expect(() => predictionMatches("null", value.expectedKey)).toThrow(
      "cannot be entered",
    );
  }
});

it("preserves null and objects that resemble nonfinite display tags", async () => {
  const [value] = await cases(
    'function f(){return {value:null,tag:{nonfinite:"NaN"}};}',
  );
  expect(
    predictionMatches(
      '{"tag":{"nonfinite":"NaN"},"value":null}',
      value.expectedKey,
    ),
  ).toBe(true);
  expect(
    predictionMatches('{"tag":{"nonfinite":"NaN"}}', value.expectedKey),
  ).toBe(false);
});

it("limits answers and rejects syntax without executing it", () => {
  const key = '["number","1"]';
  expect(() => predictionMatches("globalThis.alert(1)", key)).toThrow(
    "Enter JSON",
  );
  expect(() => predictionMatches("1".repeat(16001), key)).toThrow("16,000");
  expect(predictionSupported("broken")).toBe(false);
  expect(predictionSupported('["hole"]')).toBe(false);
  expect(() =>
    predictionMatches("[".repeat(20) + "1" + "]".repeat(20), key),
  ).toThrow("deeply nested");
});
