import { describe, it, expect } from "vitest";
// @ts-expect-error JavaScript provider boundary.
import { validateLesson, boundedJson } from "../server/lesson.mjs";
const source = {
  file: "lib.ts",
  line: 10,
  source: "function f(){\nreturn 1;\n}",
};
const lesson = {
  summary: "Returns one.",
  inputs: "None.",
  outputs: "A number.",
  sideEffects: "None visible.",
  blocks: [{ file: "lib.ts", line: 11, explanation: "Returns one." }],
  commonMistakes: ["Do not confuse the literal with an argument."],
  questions: ["What value is returned?"],
};
describe("AI lesson output validation", () => {
  it("accepts a bounded structured lesson with supported references", () =>
    expect(validateLesson(JSON.stringify(lesson), source)).toEqual(lesson));
  it("rejects invented files, lines and tool fields", () => {
    for (const invalid of [
      { ...lesson, blocks: [{ ...lesson.blocks[0], file: "secrets.ts" }] },
      { ...lesson, blocks: [{ ...lesson.blocks[0], line: 99 }] },
      { ...lesson, tool: "execute" },
    ])
      expect(() => validateLesson(JSON.stringify(invalid), source)).toThrow();
  });
  it("caps upstream response size", async () =>
    await expect(boundedJson(new Response("x".repeat(65000)))).rejects.toThrow(
      "too large",
    ));
});
