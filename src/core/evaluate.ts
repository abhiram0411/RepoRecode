import ts from "typescript";
import { getQuickJS } from "quickjs-emscripten";
import type { Evaluation, SymbolInfo } from "./types";
import { outputCodec } from "./outputCodec";
import { probes, inputExpression, normalizeFunction } from "./practiceInputs";
export { probes } from "./practiceInputs";
function compile(code: string, name: string, context = "") {
  // Stored context is data, not executable prelude. Recheck its syntax before
  // including it in the isolated compiler's declaration-only library.
  if (context.length > 8192) throw Error("Practice type context is too large.");
  const contextFile = ts.createSourceFile(
    "context.ts",
    context,
    ts.ScriptTarget.Latest,
    true,
  );
  if (contextFile.statements.some((st) => !ts.isTypeAliasDeclaration(st)))
    throw Error("Practice context may contain only type aliases.");
  const normalized = normalizeFunction(code);
  const sf = ts.createSourceFile(
    "exercise.ts",
    normalized,
    ts.ScriptTarget.Latest,
    true,
  );
  const statements = sf.statements;
  if (
    statements.length !== 1 ||
    !(
      ts.isFunctionDeclaration(statements[0]) ||
      ts.isVariableStatement(statements[0])
    )
  )
    throw Error(
      "Submit exactly one function declaration or function variable.",
    );
  const st = statements[0];
  let declared = "";
  if (ts.isFunctionDeclaration(st)) declared = st.name?.text ?? "";
  else if (ts.isVariableStatement(st)) {
    if (st.declarationList.declarations.length !== 1)
      throw Error("Submit one function.");
    const d = st.declarationList.declarations[0];
    declared = d.name.getText(sf);
    if (
      !d.initializer ||
      !(
        ts.isArrowFunction(d.initializer) ||
        ts.isFunctionExpression(d.initializer)
      )
    )
      throw Error("Expected a function.");
  }
  if (declared !== name) throw Error(`Keep the function name ${name}.`);
  const baseLib = `interface Array<T> { length: number; [n: number]: T; map<U>(fn:(v:T,i:number,a:T[])=>U):U[]; filter(fn:(v:T,i:number,a:T[])=>boolean):T[]; reduce(fn:(a:T,b:T)=>T,initial:T):T; join(s?:string):string; slice(a?:number,b?:number):T[]; includes(v:T):boolean; } interface Boolean {} interface Function {} interface CallableFunction {} interface NewableFunction {} interface IArguments {} interface Number {} interface Object {} interface RegExp {} interface String {length:number;[n:number]:string;toUpperCase():string;toLowerCase():string;trim():string;includes(v:string):boolean;slice(a?:number,b?:number):string;split(s:string):string[];} declare const Math: {abs(n:number):number;max(...n:number[]):number;min(...n:number[]):number;floor(n:number):number;ceil(n:number):number;round(n:number):number;pow(a:number,b:number):number;sqrt(n:number):number;}; declare const JSON:{stringify(v:unknown):string;parse(v:string):any}; declare function Number(v:unknown):number;declare function String(v:unknown):string;declare function Boolean(v:unknown):boolean;declare function parseInt(v:string,r?:number):number;declare function parseFloat(v:string):number;declare function isNaN(v:number):boolean;declare function isFinite(v:number):boolean;declare const NaN:number;declare const Infinity:number;`;
  const lib =
    baseLib +
    `interface ReadonlyArray<T> { readonly length: number; readonly [n:number]: T; map<U>(fn:(v:T,i:number,a:readonly T[])=>U):U[]; filter(fn:(v:T,i:number,a:readonly T[])=>boolean):T[]; reduce(fn:(a:T,b:T)=>T,initial:T):T; join(s?:string):string; slice(a?:number,b?:number):T[]; includes(v:T):boolean; }`;
  // Strip only declaration modifiers, never text inside string literals or comments.
  let source = normalized;
  const mods = ts.canHaveModifiers(st) ? ts.getModifiers(st) : undefined;
  for (const m of [...(mods ?? [])].reverse())
    if (
      m.kind === ts.SyntaxKind.ExportKeyword ||
      m.kind === ts.SyntaxKind.DefaultKeyword
    )
      source = source.slice(0, m.getStart(sf)) + source.slice(m.end);
  const map = new Map([
    ["exercise.ts", source],
    ["lib.d.ts", `${lib}\n${context}`],
  ]);
  const host: ts.CompilerHost = {
    getSourceFile: (n) =>
      map.has(n)
        ? ts.createSourceFile(n, map.get(n)!, ts.ScriptTarget.Latest, true)
        : undefined,
    getDefaultLibFileName: () => "lib.d.ts",
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (n) => map.has(n),
    readFile: (n) => map.get(n),
    getCanonicalFileName: (n) => n,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  const program = ts.createProgram(
    ["exercise.ts", "lib.d.ts"],
    { strict: true, noLib: true, target: ts.ScriptTarget.ES2022 },
    host,
  );
  const ds = ts.getPreEmitDiagnostics(program);
  if (ds.length)
    throw Error(
      ds
        .slice(0, 5)
        .map(
          (d) =>
            `${d.file && d.start !== undefined ? `Line ${d.file.getLineAndCharacterOfPosition(d.start).line + 1}: ` : ""}${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
        )
        .join("\n"),
    );
  const checker = program.getTypeChecker();
  function rejectRandom(node: ts.Node) {
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const member = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : ts.isStringLiteral(node.argumentExpression)
          ? node.argumentExpression.text
          : "";
      let base: ts.Expression = node.expression;
      while (
        ts.isParenthesizedExpression(base) ||
        ts.isAsExpression(base) ||
        ts.isTypeAssertionExpression(base)
      )
        base = base.expression;
      if (
        member === "random" &&
        ts.isIdentifier(base) &&
        base.text === "Math" &&
        checker
          .getSymbolAtLocation(base)
          ?.declarations?.some((d) => d.getSourceFile().fileName === "lib.d.ts")
      )
        throw Error(
          "Math.random output cannot be graded reliably in this exercise.",
        );
    }
    ts.forEachChild(node, rejectRandom);
  }
  rejectRandom(program.getSourceFile("exercise.ts")!);
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.None,
    },
  }).outputText;
}
export async function evaluate(
  s: SymbolInfo,
  code: string,
  feature?: "double-output",
): Promise<Evaluation> {
  const out: Evaluation = {
    passed: false,
    supported: s.standalone,
    diagnostics: [],
    cases: [],
    note: "Bounded reference-derived probes check observed behavior, not full equivalence or production correctness.",
  };
  if (!s.standalone) {
    out.diagnostics = [s.reason ?? "Unsupported exercise."];
    return out;
  }
  if (code.length > 16000) {
    out.diagnostics = ["Submission exceeds 16,000 characters."];
    return out;
  }
  let original: string, candidate: string;
  try {
    original = compile(s.code, s.name, s.practiceTypes);
  } catch (err) {
    out.supported = false;
    out.diagnostics = [
      `Reference cannot be evaluated with the supported type environment: ${String(err)}`,
    ];
    return out;
  }
  try {
    candidate = compile(code, s.name, s.practiceTypes);
  } catch (err) {
    out.diagnostics = [String(err)];
    return out;
  }
  const Q = await getQuickJS();
  function run(js: string, args: unknown[]) {
    const runtime = Q.newRuntime();
    runtime.setMemoryLimit(8 * 1024 * 1024);
    runtime.setMaxStackSize(256 * 1024);
    const deadline = Date.now() + 75;
    runtime.setInterruptHandler(() => Date.now() > deadline);
    const vm = runtime.newContext();
    try {
      const result = vm.evalCode(
        `'use strict';\n${outputCodec}\nconst __rrSubject = (function(){${js}\nreturn ${s.name};})();\nconst __result = __rrSubject(...${inputExpression(args)});\n__rrEncodeOutput(__result);`,
      );
      if (result.error) {
        const error = vm.dump(result.error);
        result.error.dispose();
        throw Error(error.message ?? "Runtime error");
      }
      const value = vm.dump(result.value);
      result.value.dispose();
      if (typeof value !== "string" || value.length > 16000)
        throw Error("Output limit exceeded.");
      const parsed = JSON.parse(value);
      if (!parsed?.display || !Array.isArray(parsed.key))
        throw Error("Unsupported output: invalid result envelope.");
      return {
        display: JSON.stringify(parsed.display),
        key: JSON.stringify(parsed.key),
      };
    } finally {
      vm.dispose();
      runtime.dispose();
    }
  }
  let changed = false,
    rejectedReferenceInputs = 0;
  for (const args of probes(s)) {
    let expected: { display: string; key: string };
    try {
      expected = run(original, args);
      if (expected.key !== run(original, args).key) {
        out.supported = false;
        out.cases = [];
        out.diagnostics = [
          "Reference output changed between identical probes. This exercise cannot be graded reliably.",
        ];
        return out;
      }
    } catch (error) {
      if (String(error).includes("Unsupported output:")) {
        out.supported = false;
        out.cases = [];
        out.diagnostics = [`Reference ${String(error)}`];
        return out;
      }
      rejectedReferenceInputs++;
      continue;
    }
    if (feature === "double-output") {
      const value = JSON.parse(expected.display);
      if (
        value.type !== "number" ||
        typeof value.value !== "number" ||
        !Number.isFinite(value.value * 2)
      ) {
        out.supported = false;
        out.diagnostics = [
          "This mission requires finite numeric outputs on every reference probe.",
        ];
        out.cases = [];
        return out;
      }
      const transformed = JSON.stringify({
        value: value.value * 2,
        type: "number",
      });
      changed ||= transformed !== expected.display;
      expected = {
        display: transformed,
        key: JSON.stringify(["number", String(value.value * 2)]),
      };
    }
    let actual: string;
    let matches = false;
    try {
      const received = run(candidate, args);
      actual = received.display;
      matches = expected.key === received.key;
    } catch (err) {
      actual = String(err);
    }
    out.cases.push({
      input: inputExpression(args),
      expected: expected.display,
      expectedKey: expected.key,
      actual,
      passed: matches,
    });
  }
  if (!out.cases.length) {
    out.supported = false;
    out.diagnostics = [
      "No probes succeeded against the reference. A project-specific test harness is required.",
    ];
    return out;
  }
  if (feature && !changed) {
    out.supported = false;
    out.diagnostics = [
      "These probes cannot distinguish this feature from the original. Choose another function.",
    ];
    return out;
  }
  out.passed = out.cases.every((c) => c.passed);
  out.diagnostics = out.passed
    ? [`Passed ${out.cases.length} reference-derived behavioral probes.`]
    : [
        `${out.cases.filter((c) => !c.passed).length} of ${out.cases.length} probes differ. Inspect the first mismatch and trace its inputs.`,
      ];
  if (rejectedReferenceInputs)
    out.diagnostics.push(
      `${rejectedReferenceInputs} probe inputs could not run against the reference and were excluded. Exception behavior is not graded.`,
    );
  return out;
}
