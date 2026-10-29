import { it, expect } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
const api = (client: string, server: string) =>
  analyze([
    { path: "client.ts", content: client },
    { path: "server.ts", content: server },
  ]).apiFlow!;
it("resolves immutable local paths, string templates and request methods", () => {
  const result = api(
    "const base='/api';const resource='items';const verb='post' as const;export function load(){fetch(`${base}/${resource}`,{method:verb})}",
    "import express from 'express';const app=express();const prefix='/api/';const route=prefix+'items';app.post(route,()=>{})",
  );
  expect(result.requests[0]).toMatchObject({
    method: "POST",
    path: "/api/items",
  });
  expect(result.links).toEqual([
    { request: 0, route: 0, evidence: "candidate" },
  ]);
});
it("resolves renamed imports and reexports by declaration rather than name", () => {
  const result = analyze([
    {
      path: "paths.ts",
      content:
        "export const base='/api';export const item=base+'/items';export const verb='POST'",
    },
    {
      path: "barrel.ts",
      content: "export {item as endpoint,verb} from './paths'",
    },
    {
      path: "client.ts",
      content:
        "import {endpoint as url,verb} from './barrel';export function load(){fetch(url,{method:verb})}export function shadow(url:string){fetch(url)}",
    },
    {
      path: "server.ts",
      content:
        "import express from 'express';import {item} from './paths';const app=express();app.post(item,()=>{})",
    },
  ]).apiFlow!;
  expect(result.requests).toHaveLength(1);
  expect(result.routes).toHaveLength(1);
  expect(result.links).toHaveLength(1);
});
it.each([
  "let url='/items';fetch(url)",
  "const url=makeUrl();fetch(url)",
  "const config={url:'/items'};fetch(config.url)",
  "const url='/items';function f(url:string){fetch(url)}",
  "const a=b;const b=a;fetch(a)",
  "const url='/items/'+1;fetch(url)",
  "const id=1;fetch(`/items/${id}`)",
  "const url='/items';fetch(url,{method:unknownVerb})",
  "const url='/items';let verb='GET';fetch(url,{method:verb})",
  "const {url}={url:'/items'};fetch(url)",
])("does not infer runtime or mutable strings: %s", (client) => {
  expect(api(client, "").requests).toEqual([]);
});
it("does not turn type-only imports into runtime endpoints", () => {
  const result = analyze([
    { path: "paths.ts", content: "export const url='/items'" },
    {
      path: "client.ts",
      content:
        "import type {url} from './paths';export function load(){fetch(url)}",
    },
  ]).apiFlow!;
  expect(result.requests).toEqual([]);
});
it("bounds constant chains and expanded string lengths", () => {
  const chain = Array.from(
    { length: 12 },
    (_, i) => `const p${i}=${i === 0 ? "'/items'" : `p${i - 1}`};`,
  ).join("");
  expect(api(chain + "fetch(p11)", "").requests).toEqual([]);
  expect(
    api(`const url='/${"x".repeat(300)}';fetch(url)`, "").requests,
  ).toEqual([]);
});
it.each([
  "export type {url} from './paths'",
  "export {type url} from './paths'",
])("excludes erased reexports: %s", (barrel) => {
  const result = analyze([
    { path: "paths.ts", content: "export const url='/items'" },
    { path: "barrel.ts", content: barrel },
    {
      path: "client.ts",
      content:
        "import {url} from './barrel';export function load(){fetch(url)}",
    },
  ]).apiFlow!;
  expect(result.requests).toEqual([]);
});
it("recomputes candidate links when an imported constant changes", () => {
  const index = createAnalyzer();
  const client = {
    path: "client.ts",
    content: "import {url} from './paths';export function load(){fetch(url)}",
  };
  const server = {
    path: "server.ts",
    content:
      "import express from 'express';const app=express();app.get('/items',()=>{})",
  };
  expect(
    index([
      { path: "paths.ts", content: "export const url='/items'" },
      client,
      server,
    ]).analysis.apiFlow?.links,
  ).toHaveLength(1);
  const changed = [
    { path: "paths.ts", content: "export const url='/other'" },
    client,
    server,
  ];
  const result = index(changed);
  expect(result.analysis.apiFlow?.links).toEqual([]);
  expect(result.analysis).toEqual(analyze(changed));
});
it("links literal fetch requests and declaration-resolved Express routes as candidates", () => {
  const result = api(
    "export async function load(){return fetch('/api/items',{method:'post'})}",
    "import express from 'express';const app=express();app.post('/api/items',()=>{});app.get('/api/items',()=>{})",
  );
  expect(result.requests).toEqual([
    { file: "client.ts", line: 1, method: "POST", path: "/api/items" },
  ]);
  expect(result.links).toEqual([
    { request: 0, route: 0, evidence: "candidate" },
  ]);
});
it("supports renamed Router imports but does not infer mount prefixes", () => {
  const result = api(
    "export function load(){fetch('/items');fetch('/api/items')}",
    "import {Router as makeRouter} from 'express';const router=makeRouter();router.get('/items',()=>{})",
  );
  expect(result.routes).toHaveLength(1);
  expect(result.links).toEqual([
    { request: 0, route: 0, evidence: "candidate" },
  ]);
});
it("rejects shadowed fetch, fake or type-only Express imports and unknown methods", () => {
  const result = api(
    "export function load(fetch:any){fetch('/items')}export function other(){fetch('/items',{...options});fetch('/items',{method:verb});fetch('/items',{['method']:'POST'});fetch('/items',{method:'GET',method:'POST'})}",
    "import type express from 'express';const app=express();app.get('/items',()=>{});const fake={get(){}};fake.get('/items',()=>{})",
  );
  expect(result.requests).toEqual([]);
  expect(result.routes).toEqual([]);
});
it("does not match dynamic, external, protocol-relative, query-changed or mismatched paths", () => {
  const result = api(
    "export function load(id:string){fetch('/items/'+id);fetch('https://example.com/items');fetch('//example.com/items');fetch('/items?x=1');fetch('/items',{method:'POST'})}",
    "import express from 'express';const app=express();app.get('/items',()=>{})",
  );
  expect(result.requests).toHaveLength(2);
  expect(result.links).toEqual([]);
});
it("refreshes changed routes despite reused unrelated source indexes", () => {
  const index = createAnalyzer();
  const client = {
    path: "client.ts",
    content: "export function f(){return fetch('/items')}",
  };
  index([
    client,
    {
      path: "server.ts",
      content:
        "import express from 'express';const app=express();app.get('/old',()=>{})",
    },
  ]);
  const source = [
    client,
    {
      path: "server.ts",
      content:
        "import express from 'express';const app=express();app.get('/items',()=>{})",
    },
  ];
  expect(index(source).analysis.apiFlow?.links).toHaveLength(1);
  expect(index(source).analysis).toEqual(analyze(source));
});
it("bounds indexed sites and ambiguous candidate combinations", () => {
  const result = api(
    "export function f(){" + "fetch('/items');".repeat(150) + "}",
    "import express from 'express';const app=express();" +
      "app.get('/items',()=>{});".repeat(100),
  );
  expect(result.requests.length + result.routes.length).toBe(200);
  expect(result.links).toHaveLength(200);
  expect(result.omitted).toBeGreaterThan(0);
});
it("does not infer inherited request methods or nonexistent uppercase Express methods", () => {
  const result = api(
    "export function f(){fetch('/items',{__proto__:{method:'POST'}})}",
    "import express from 'express';const app=express();app.GET('/items',()=>{})",
  );
  expect(result.requests).toEqual([]);
  expect(result.routes).toEqual([]);
});
it("resolves imported app instances without confusing a shadowed receiver", () => {
  const result = analyze([
    {
      path: "app.ts",
      content: "import express from 'express';export const app=express()",
    },
    {
      path: "routes.ts",
      content:
        "import {app as server} from './app';export function install(){server.get('/items',()=>{})}export function fake(server:any){server.get('/other',()=>{})}",
    },
    {
      path: "client.ts",
      content: "export function load(){return fetch('/items')}",
    },
  ]).apiFlow!;
  expect(result.routes).toHaveLength(1);
  expect(result.routes[0].file).toBe("routes.ts");
  expect(result.links).toEqual([
    { request: 0, route: 0, evidence: "candidate" },
  ]);
});
