import { expect, it } from "vitest";
import { createInteractivePreview } from "../src/core/interactivePreview";
import { hookSites } from "../src/core/hookSites";
import { analyze } from "../src/core/analyze";

const file = (content: string) => ({ path: "App.tsx", content });
it("binds React aliases and namespaces without mistaking shadowed or unrelated calls", () => {
  const sites = hookSites(
    file(`import React, {useState as state} from 'react';
    import * as R from 'react'; import {useReducer} from 'other';
    function custom(state){return state(9)}
    function other(React){return React.useState(8)}
    export function App(){const [n]=state(0);const [yes]=React.useState(false);const [r]=R.useReducer(n=>n,1);useReducer();return <p/>}`),
  );
  expect([...sites.values()]).toEqual([
    { hook: "useState", label: "n" },
    { hook: "useState", label: "yes" },
    { hook: "useReducer", label: "r" },
  ]);
});

it("uses the same resolved hook evidence in static analysis", () => {
  const result = analyze([
    file(`import {useState as makeState} from 'react';
    function useState(n){return [n]}
    function Shadow(makeState){return makeState(9)}
    export function App(){const [n]=makeState(0);useState(8);return <p>{n}</p>}`),
  ]);
  const facts = result.facts?.filter((f) => f.kind === "State");
  expect(facts).toHaveLength(1);
  expect(facts![0].detail).toContain("makeState is imported React useState");
});

it("observes actual state/reducer values per action and never changes hook results", async () => {
  const session = await createInteractivePreview(
    [
      file(`import {useState as state,useReducer} from 'react';
    export default function App(){const [n,setN]=state(0);const [label,dispatch]=useReducer((s,a)=>s+a,'A');
      return <button onClick={()=>{setN(n+1);dispatch('B')}}>{n}:{label}</button>}`),
    ],
    "App.tsx",
    "default",
  );
  try {
    expect(session.snapshot().state.reads.map((r) => r.value)).toEqual([
      "0",
      '"A"',
    ]);
    const id = /data-rr-node="(\d+)"/.exec(session.snapshot().html)![1];
    const next = session.dispatch({ id, type: "click" });
    expect(next.html).toContain("1:AB");
    expect(next.state.reads.map((r) => [r.label, r.value])).toEqual([
      ["n", "1"],
      ["label", '"AB"'],
    ]);
    next.state.reads[0].value = "fake";
    expect(session.snapshot().state.reads[0].value).toBe("1");
  } finally {
    session.dispose();
  }
});

it("inspects bounded cyclic objects without invoking getters or toJSON", async () => {
  const session = await createInteractivePreview(
    [
      file(`import {useState} from 'react';
    export default function App(){const [value]=useState(()=>{const v={text:'x'.repeat(400),get bad(){throw Error('getter ran')},toJSON(){throw Error('toJSON ran')}};v.self=v;return v});return <p>safe</p>}`),
    ],
    "App.tsx",
    "default",
  );
  try {
    const read = session.snapshot().state.reads[0];
    expect(read.value).toContain("[accessor]");
    expect(read.value).toContain("[circular]");
    expect(read.value).toContain("[function]");
    expect(read.value.length).toBeLessThan(1000);
    expect(session.snapshot().html).toContain("safe");
  } finally {
    session.dispose();
  }
});

it("retains separate reads for multiple instances and bounds large render trees", async () => {
  const session = await createInteractivePreview(
    [
      file(`import {useState} from 'react';
    function Child({n}){const [value]=useState(n);return <p>{value}</p>}
    export default function App(){return <div>{Array.from({length:120},(_,n)=><Child key={n} n={n}/>)}</div>}`),
    ],
    "App.tsx",
    "default",
  );
  try {
    expect(session.snapshot().state.reads).toHaveLength(100);
    expect(
      session
        .snapshot()
        .state.reads.slice(0, 3)
        .map((r) => r.value),
    ).toEqual(["0", "1", "2"]);
    expect(session.snapshot().state.omitted).toBe(20);
  } finally {
    session.dispose();
  }
});
