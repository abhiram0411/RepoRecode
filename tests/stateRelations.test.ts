import { describe, expect, it } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
function flow(content: string) {
  return analyze([{ path: "App.tsx", content }]).stateFlow!;
}
describe("source-resolved state relationships", () => {
  it("links setter calls, shorthand initializers and JSX props to their actual binding", () => {
    const result = flow(`import {useState as state} from 'react';
      export function App(){
        const [count,setCount]=state(0);
        const total=count*2; const record={count};
        return <button value={count} onClick={setCount}>{total}<span onClick={()=>setCount(count+1)}>{count}</span></button>
      }`);
    expect(result.relations.map((r) => r.kind)).toEqual(
      expect.arrayContaining(["derive", "prop", "handler", "update", "read"]),
    );
    expect(
      result.relations.every(
        (r) =>
          r.state.name === "count" &&
          r.state.line === 3 &&
          r.evidence === "static",
      ),
    ).toBe(true);
    expect(
      result.relations
        .filter((r) => r.kind === "derive")
        .map((r) => r.site.label),
    ).toEqual(["total initializer", "record initializer"]);
    expect(result.relations.find((r) => r.kind === "update")?.site.label).toBe(
      "setCount(count+1)",
    );
    expect(result.omitted).toBe(0);
  });
  it("does not confuse shadowed values/setters or type-only references", () => {
    const result = flow(`import {useState} from 'react'; export function App(){
      const [count,setCount]=useState(0);
      type Count=typeof count;
      function shadow(count:number,setCount:(n:number)=>void){setCount(count);return count}
      const obj={setCount:(n:number)=>n};obj.setCount(1);
      return <p>{count}</p>;
    }`);
    expect(result.relations).toHaveLength(1);
    expect(result.relations[0].kind).toBe("read");
  });
  it("supports reducer namespace imports and keeps same-named component state separate", () => {
    const result = flow(`import * as React from 'react';
      export function A(){const [value,dispatch]=React.useReducer((s,a)=>s+a,0);dispatch(1);return <p>{value}</p>}
      export function B(){const [value,setValue]=React.useState(9);setValue(2);return <p>{value}</p>}`);
    expect(
      result.relations
        .filter((r) => r.kind === "update")
        .map((r) => [r.state.hook, r.state.line]),
    ).toEqual([
      ["useReducer", 2],
      ["useState", 3],
    ]);
  });
  it("excludes non-React hooks, mutable tuples and indirect setter aliases", () => {
    const result = flow(`import {useState} from 'other';
      function fake(){const [a,b]=useState(1);b(a);return a}
      import {useState as real} from 'react';
      function mutable(){let [a,b]=real(1);b(a);return a}
      function indirect(){const [a,b]=real(1);const alias=b;alias(1);return 0}`);
    expect(result.relations).toEqual([]);
  });
  it("recomputes state links when the imported hook identity changes", () => {
    const index = createAnalyzer();
    const source =
      "export function App(){const [n,setN]=useState(0);setN(1);return <p>{n}</p>}";
    expect(
      index([
        {
          path: "App.tsx",
          content: "import {useState} from 'react';" + source,
        },
      ]).analysis.stateFlow?.relations,
    ).toHaveLength(2);
    expect(
      index([
        {
          path: "App.tsx",
          content: "import {useState} from 'other';" + source,
        },
      ]).analysis.stateFlow?.relations,
    ).toEqual([]);
  });
  it("caps output and counts omitted distinct relationships", () => {
    const result = flow(
      "import {useState} from 'react';function App(){const [n,setN]=useState(0);\n" +
        Array.from({ length: 220 }, (_, i) => `setN(${i});`).join("\n") +
        "}",
    );
    expect(result.relations).toHaveLength(200);
    expect(result.omitted).toBe(20);
  });
});
