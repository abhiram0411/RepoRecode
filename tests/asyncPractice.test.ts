import { it, expect } from "vitest";
import { analyze } from "../src/core/analyze";
import { evaluate } from "../src/core/evaluate";
import { functionStub } from "../src/core/functionStub";
const sample = (content: string) =>
  analyze([{ path: "app.ts", content }]).symbols.find(
    (s) => s.kind === "function",
  )!;
it("grades resolved async results and preserves async rewrite stubs", async () => {
  const s = sample(
    "export async function double(n:number):Promise<number>{const value=await Promise.resolve(n);return value*2}",
  );
  expect(s.standalone).toBe(true);
  expect(s.async).toBe(true);
  expect(functionStub(s, "Rewrite")).toMatch(/^async function/);
  expect((await evaluate(s, s.code)).passed).toBe(true);
  const bad = await evaluate(
    s,
    "async function double(n:number){return (await Promise.resolve(n))+1}",
  );
  expect(bad.passed).toBe(false);
  expect(bad.cases.length).toBeGreaterThan(0);
});
it("supports promise chains, rejection recovery and Promise.all without host APIs", async () => {
  for (const code of [
    "export function f(n:number):Promise<number>{return Promise.resolve(n).then(x=>x+1)}",
    "export async function f(n:number){const values=await Promise.all([Promise.resolve(n),Promise.resolve(2)]);return values[0]+values[1]}",
    "export async function f(n:number){return await Promise.reject<number>(n).catch(()=>n+2)}",
  ]) {
    const s = sample(code);
    expect(s.standalone).toBe(true);
    expect((await evaluate(s, s.code)).passed).toBe(true);
  }
});
it("retains named result types for asynchronous functions", async () => {
  const s = sample(
    "type Box<T>={value:T};export async function f(n:number):Promise<Box<number>>{return {value:await Promise.resolve(n)}}",
  );
  expect(s.standalone).toBe(true);
  expect(s.practiceTypes).toContain("type Box<T>");
  expect((await evaluate(s, s.code)).passed).toBe(true);
});
it("bounds pending and endless microtask candidates instead of hanging", async () => {
  const s = sample("export async function f(n:boolean){return n}");
  for (const code of [
    "async function f(n:boolean){return await new (Promise as any)(()=>{})}",
    "async function f(n:boolean){while(true){await Promise.resolve()}return n}",
  ]) {
    const result = await evaluate(s, code);
    expect(result.passed).toBe(false);
    expect(result.cases[0]?.actual).toContain("promise did not settle");
  }
});
it("reports unsupported pending reference promises", async () => {
  const s = sample(
    "export async function f(n:boolean){while(true){await Promise.resolve()}return n}",
  );
  const result = await evaluate(s, s.code);
  expect(result.supported).toBe(false);
  expect(result.diagnostics.join(" ")).toContain("promise did not settle");
});
it("keeps thrown/rejected reference inputs visible as excluded coverage", async () => {
  const s = sample(
    'export async function f(n:boolean){if(n)return Promise.reject("invalid");return 1}',
  );
  const result = await evaluate(s, s.code);
  expect(result.passed).toBe(true);
  expect(result.diagnostics.join(" ")).toContain("1 probe inputs");
});
it("does not admit timers, fetch or unresolved project dependencies", () => {
  for (const code of [
    'export async function f(n:number){return await fetch("https://example.com")}',
    "export async function f(n:number){return setTimeout(()=>n,1)}",
  ])
    expect(sample(code).standalone).toBe(false);
});

it("does not substitute the builtin Promise for an imported same-named dependency", () => {
  const s = sample(
    "import {Promise} from './custom';export function f(n:number){return Promise.resolve(n)}",
  );
  expect(s.standalone).toBe(false);
  expect(s.reason).toContain("external context");
});
