import { it, expect } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
const api = (client: string, server: string) =>
  analyze([
    { path: "client.ts", content: client },
    { path: "server.ts", content: server },
  ]).apiFlow!;
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
