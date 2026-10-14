import { describe, it, expect } from "vitest";
import { createInteractivePreview } from "../src/core/interactivePreview";
import { demoFiles } from "../src/core/demo";
const nodeId = (html: string, tag: string) =>
  new RegExp(`<${tag}[^>]*data-rr-node="(\\d+)"`).exec(html)![1];
describe("isolated interactive React", () => {
  it("runs the real sample click handler and retains React state across events", async () => {
    const session = await createInteractivePreview(
      demoFiles,
      "src/App.tsx",
      "default",
    );
    try {
      expect(session.snapshot().html).toContain("0% complete");
      const id = nodeId(session.snapshot().html, "button");
      expect(session.dispatch({ id, type: "click" }).html).toContain(
        "20% complete",
      );
      const next = session.dispatch({ id, type: "click" });
      expect(next.html).toContain("40% complete");
      expect(next.observations).toEqual([
        { sequence: 1, event: "click", changed: true },
        { sequence: 2, event: "click", changed: true },
      ]);
      expect(next.html).not.toContain("onClick");
      expect(next.trace.calls.map((call) => call.name)).toEqual([
        "onClick",
        "App",
        "TrailCard",
        "completionRate",
      ]);
      expect(
        next.trace.calls.find((call) => call.name === "completionRate")?.file,
      ).toBe("src/lib/progress.ts");
    } finally {
      session.dispose();
    }
  });
  it("runs effects, cleanup and reducer updates with form data", async () => {
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content: `import {useState,useEffect,useReducer} from 'react';
      export default function App(){const [name,setName]=useState(''); const [n,inc]=useReducer(n=>n+1,0);
      const [status,setStatus]=useState('');useEffect(()=>{setStatus('ready');return ()=>{}},[]);
      return <div><input value={name} onChange={e=>setName(e.target.value)}/><p>{status}:{name}:{n}</p><button onClick={inc}>Add</button></div>}`,
        },
      ],
      "App.tsx",
      "default",
    );
    try {
      const first = session.snapshot().html;
      expect(first).toContain("ready::0");
      const second = session.dispatch({
        id: nodeId(first, "input"),
        type: "change",
        value: "Ada",
      }).html;
      expect(second).toContain("ready:Ada:0");
      expect(
        session.dispatch({ id: nodeId(second, "button"), type: "click" }).html,
      ).toContain("ready:Ada:1");
    } finally {
      session.dispose();
    }
  });
  it("interrupts runaway handlers and invalidates the session", async () => {
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content:
            "export default function App(){return <button onClick={()=>{while(true){}}}>Loop</button>}",
        },
      ],
      "App.tsx",
      "default",
    );
    expect(() =>
      session.dispatch({
        id: nodeId(session.snapshot().html, "button"),
        type: "click",
      }),
    ).toThrow("interrupted");
    session.dispose();
  }, 5000);
  it("denies host access from effects and strips navigation output", async () => {
    await expect(
      createInteractivePreview(
        [
          {
            path: "App.tsx",
            content: `import {useEffect} from 'react';export default function App(){useEffect(()=>{fetch('https://evil.test')},[]);return <p/>}`,
          },
        ],
        "App.tsx",
        "default",
      ),
    ).rejects.toThrow("fetch");
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content:
            'export default function App(){return <a href="https://evil.test">Go</a>}',
        },
      ],
      "App.tsx",
      "default",
    );
    expect(session.snapshot().html).not.toContain("evil.test");
    session.dispose();
  });
  it("reorders keyed children, removes them and runs effect cleanup", async () => {
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content: `import {useState,useEffect} from 'react';
      let cleaned=0;
      function Child(){useEffect(()=>()=>{cleaned++},[]);return <span>child</span>}
      export default function App(){const [n,setN]=useState(0);const values=n===0?['A','B','C']:n===1?['C','A']:['D','C','A'];
      return <div><button onClick={()=>setN(n+1)}>Next</button>{n===0&&<Child/>}<p>{cleaned}</p><ul>{values.map(v=><li key={v}>{v}</li>)}</ul></div>}`,
        },
      ],
      "App.tsx",
      "default",
    );
    try {
      const id = nodeId(session.snapshot().html, "button");
      const removed = session.dispatch({ id, type: "click" }).html;
      expect(removed).not.toContain(">child<");
      expect(
        [...removed.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((m) => m[1]),
      ).toEqual(["C", "A"]);
      const next = session.dispatch({ id, type: "click" }).html;
      expect(next).toMatch(/<p[^>]*>1<\/p>/);
      expect(
        [...next.matchAll(/<li[^>]*>(.*?)<\/li>/g)].map((m) => m[1]),
      ).toEqual(["D", "C", "A"]);
    } finally {
      session.dispose();
    }
  });
  it("delivers input and change once, bubbles events, and honors stopPropagation", async () => {
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content: `import {useState} from 'react';
      export default function App(){const [log,setLog]=useState(''); return <div onClick={()=>setLog(v=>v+'parent')}><input onInput={()=>setLog(v=>v+'input;')} onChange={e=>setLog(v=>v+e.target.value+';')}/><button onClick={e=>{e.stopPropagation();setLog(v=>v+'child')}}>Stop</button><p>{log}</p></div>}`,
        },
      ],
      "App.tsx",
      "default",
    );
    try {
      const next = session.dispatch({
        id: nodeId(session.snapshot().html, "input"),
        type: "input",
        value: "Ada",
      });
      expect(next.html).toContain("input;Ada;");
      const stop = session.dispatch({
        id: nodeId(next.html, "button"),
        type: "click",
      });
      expect(stop.html).toContain("input;Ada;child");
      expect(stop.html).not.toContain("parent");
    } finally {
      session.dispose();
    }
  });
  it("preserves source and prop strings that resemble renderer calls", async () => {
    const phrase = "__rrRender(__rrReact.createElement";
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content: `export default function App({text}){return <p>{'${phrase}'}:{text}</p>}`,
        },
      ],
      "App.tsx",
      "default",
      { text: phrase },
    );
    expect(session.snapshot().html).toContain(phrase + ":" + phrase);
    session.dispose();
  });
  it("submits inside the VM and honors click preventDefault", async () => {
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content: `import {useState} from 'react';export default function App(){const [n,setN]=useState(0);return <form onSubmit={e=>{e.preventDefault();setN(n+1)}}><button onClick={e=>{if(n===1)e.preventDefault()}}>Send</button><p>{n}</p></form>}`,
        },
      ],
      "App.tsx",
      "default",
    );
    try {
      const id = nodeId(session.snapshot().html, "button");
      expect(session.dispatch({ id, type: "click" }).html).toMatch(
        /<p[^>]*>1<\/p>/,
      );
      expect(session.dispatch({ id, type: "click" }).html).toMatch(
        /<p[^>]*>1<\/p>/,
      );
    } finally {
      session.dispose();
    }
  });
  it("bounds traces and preserves directive prologues, arrow returns and method receivers", async () => {
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content: `
      function strict(){'use strict';return this===undefined}
      const twice=(n)=>n*2;
      const obj={value:3,get(){return this.value}};
      export default function App(){let n=0;for(let i=0;i<150;i++)n+=twice(1);return <p>{String(strict())}:{obj.get()}:{n}</p>}`,
        },
      ],
      "App.tsx",
      "default",
    );
    try {
      expect(session.snapshot().html).toContain("true:3:300");
      expect(session.snapshot().trace.calls).toHaveLength(100);
      expect(session.snapshot().trace.omitted).toBeGreaterThan(50);
    } finally {
      session.dispose();
    }
  });
  it("rejects async handlers and missing event targets without leaving a live session", async () => {
    const session = await createInteractivePreview(
      [
        {
          path: "App.tsx",
          content: `export default function App(){return <button onClick={async()=>42}>Async</button>}`,
        },
      ],
      "App.tsx",
      "default",
    );
    expect(() =>
      session.dispatch({
        id: nodeId(session.snapshot().html, "button"),
        type: "click",
      }),
    ).toThrow("Async");
    expect(() => session.dispatch({ id: "1", type: "click" })).toThrow("ended");
    session.dispose();
  });
});
