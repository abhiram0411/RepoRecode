import { describe, expect, it } from "vitest";
import { analyze, createAnalyzer } from "../src/core/analyze";
const flow = (body: string) =>
  analyze([
    {
      path: "App.tsx",
      content: `import {useState} from 'react'; export function App(){const [count,setCount]=useState(0);${body}}`,
    },
  ]).stateFlow!.relations;
describe("bounded const state provenance", () => {
  it("links static and optional property reads through the existing two-step boundary", () => {
    const r = flow(
      "const [model]=useState({stats:{score:1}});const score=model?.stats?.score;const text=`Score ${score}`;return <p title={text}/>",
    );
    const prop = r.find((r) => r.kind === "prop");
    expect(prop?.state.name).toBe("model");
    expect(prop?.via?.map((v) => v.name)).toEqual(["score", "text"]);
    expect(prop?.evidence).toBe("static");
  });
  it.each(['model["score"]', 'model?.["score"]', "model[0]"])(
    "follows a literal index without treating its key as a state reference: %s",
    (expression) => {
      const r = flow(
        `const [model]=useState({score:1});const score=${expression};return <p title={score}/>`,
      );
      expect(
        r.filter((r) => r.kind === "prop").map((r) => r.state.name),
      ).toEqual(["model"]);
    },
  );
  it("rejects dynamic indexes, calls, mutations and object construction", () => {
    const r = flow(
      'const [model]=useState({score:1});const [key]=useState("score");const dynamic=model[key];const called=model.read();const changed=model.score++;const made=({score:model.score}).score;return <p dynamic={dynamic} called={called} changed={changed} made={made}/>',
    );
    expect(r.filter((r) => r.kind === "prop")).toEqual([]);
  });
  it("does not confuse a property name with a same-named state binding", () => {
    const r = flow(
      "const [model]=useState({count:1});const score=model.count;return <p title={score}/>",
    );
    expect(r.filter((r) => r.kind === "prop").map((r) => r.state.name)).toEqual(
      ["model"],
    );
  });
  it("keeps object reads lexical and never invokes a getter to infer values", () => {
    const r = flow(
      'const [model]=useState({get score(){throw new Error("must not run")}});const score=model.score;return <p title={score}/>',
    );
    expect(r.find((r) => r.kind === "prop")?.state.name).toBe("model");
    expect(r.find((r) => r.kind === "prop")?.evidence).toBe("static");
  });
  it("rejects more than eight distinct provenance paths for a binding", () => {
    const declarations = Array.from(
      { length: 9 },
      (_, i) => `const [s${i}]=useState(0);`,
    ).join("");
    const expression = Array.from({ length: 9 }, (_, i) => `s${i}`).join("+");
    const r = flow(
      declarations + `const total=${expression};return <p title={total}/>`,
    );
    expect(r.filter((r) => r.kind === "prop")).toEqual([]);
  });
  it("links a two-step expression chain to a JSX prop and its exact declarations", () => {
    const r = flow(
      "const doubled=count*2;\nconst label=`Total: ${doubled}`;\nreturn <output title={label}>{doubled}</output>",
    );
    const prop = r.find(
      (r) => r.kind === "prop" && r.via?.at(-1)?.name === "label",
    );
    expect(prop?.state.name).toBe("count");
    expect(prop?.via).toEqual([
      { file: "App.tsx", line: 1, name: "doubled" },
      { file: "App.tsx", line: 2, name: "label" },
    ]);
    expect(prop?.site.line).toBe(3);
    expect(prop?.evidence).toBe("static");
    expect(
      r.some((r) => r.kind === "read" && r.via?.[0].name === "doubled"),
    ).toBe(true);
  });
  it("keeps distinct state roots and declared paths through conditions and scalar operators", () => {
    const r = flow(
      "const [other]=useState(1);const sum=(count??0)+other;const enabled=!(sum<2);return <p title={enabled}>{sum}</p>",
    );
    expect(
      r
        .filter((r) => r.kind === "prop")
        .map((r) => r.state.name)
        .sort(),
    ).toEqual(["count", "other"]);
    expect(
      r
        .filter((r) => r.kind === "prop")
        .every((r) => r.via?.map((v) => v.name).join(",") === "sum,enabled"),
    ).toBe(true);
  });
  it("does not follow a third binding, calls, mutable locals, properties, mutation or closures", () => {
    const r = flow(
      "const a=count+1;const b=a*2;const c=b+1;let mutable=count;const called=String(count);const field=({count}).count;const closure=()=>count;const changed=(mutable=count);return <p c={c} m={mutable} call={called} field={field} closure={closure} changed={changed}/>",
    );
    expect(r.filter((r) => r.kind === "prop")).toEqual([]);
    expect(
      r.some((r) => r.site.label === "c initializer" && r.via?.length === 2),
    ).toBe(true);
  });
  it("does not confuse shadowed aliases, type references or another function's captures", () => {
    const r = flow(
      "const doubled=count*2;type X=typeof doubled;function child(doubled:number){return <p title={doubled}/>};function closure(){const text=doubled+1;return <p title={text}/>};return <p>{doubled}</p>",
    );
    expect(r.filter((r) => r.via)).toHaveLength(1);
    expect(r.find((r) => r.via)?.kind).toBe("read");
  });
  it("deduplicates repeated references and excludes updater aliases", () => {
    const r = flow(
      "const doubled=count+count;const alias=setCount;alias(1);return <p title={doubled}/>",
    );
    expect(r.filter((r) => r.kind === "prop")).toHaveLength(1);
    expect(r.some((r) => r.kind === "update")).toBe(false);
  });
  it("invalidates the derived chain when an imported hook changes", () => {
    const index = createAnalyzer();
    const body =
      "function App(){const [count]=useState(0);const double=count*2;return <p>{double}</p>}";
    expect(
      index([
        { path: "App.tsx", content: "import {useState} from 'react';" + body },
      ]).analysis.stateFlow?.relations.some((r) => r.via),
    ).toBe(true);
    expect(
      index([
        { path: "App.tsx", content: "import {useState} from 'other';" + body },
      ]).analysis.stateFlow?.relations,
    ).toEqual([]);
  });
  it("bounds candidate indexing and keeps the overall relationship limit", () => {
    const r = flow(
      Array.from({ length: 230 }, (_, i) => `const a${i}=count+${i};`).join(
        "\n",
      ) + "return <p title={a229}/>",
    );
    expect(r.length).toBeLessThanOrEqual(200);
    expect(r.some((r) => r.via?.some((v) => v.name === "a229"))).toBe(false);
  });
});
