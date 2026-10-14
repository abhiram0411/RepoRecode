import ts from "typescript";
import { describeExpression } from "./expressionExplanation";
import { reactStateHook } from "./hookSites";
import { parameterValues } from "./practiceInputs";
import { stateRelations } from "./stateRelations";
import type {
  Analysis,
  SourceFile,
  SymbolInfo,
  Lesson,
  Preferences,
} from "./types";

const libs = new Set([
  "Math",
  "JSON",
  "Number",
  "String",
  "Boolean",
  "Array",
  "Object",
  "undefined",
  "NaN",
  "Infinity",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
]);
export type AnalysisUpdate = {
  analysis: Analysis;
  parsedFiles: number;
  reusedFiles: number;
  removedFiles: number;
};

// Keep only the most recent snapshot in this worker. Exact content comparisons
// avoid hash collisions. Semantic results are always recomputed because even an
// unchanged importer can resolve differently after another file changes.
export function createAnalyzer() {
  let previous = new Map<string, ts.SourceFile>();
  return (files: SourceFile[]): AnalysisUpdate => {
    const sources = new Map<string, ts.SourceFile>();
    let parsedFiles = 0,
      reusedFiles = 0;
    for (const file of files) {
      if (!/\.[cm]?[jt]sx?$/.test(file.path)) continue;
      const cached = previous.get(file.path);
      if (cached?.text === file.content) {
        sources.set(file.path, cached);
        reusedFiles++;
      } else {
        sources.set(
          file.path,
          ts.createSourceFile(
            file.path,
            file.content,
            ts.ScriptTarget.Latest,
            true,
          ),
        );
        parsedFiles++;
      }
    }
    const removedFiles = [...previous.keys()].filter(
      (path) => !sources.has(path),
    ).length;
    const analysis = analyzeSources(files, sources);
    previous = sources;
    return { analysis, parsedFiles, reusedFiles, removedFiles };
  };
}

export function analyze(files: SourceFile[]): Analysis {
  return createAnalyzer()(files).analysis;
}

function analyzeSources(
  files: SourceFile[],
  sources: Map<string, ts.SourceFile>,
): Analysis {
  const host: ts.CompilerHost = {
    getSourceFile: (n) => sources.get(n),
    getDefaultLibFileName: () => "",
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (n) => sources.has(n),
    readFile: (n) => sources.get(n)?.text,
    getCanonicalFileName: (n) => n,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
    resolveModuleNames: (names, from) =>
      names.map((name) => {
        const target = resolve(from, name);
        return target
          ? {
              resolvedFileName: target,
              extension: target.endsWith(".tsx")
                ? ts.Extension.Tsx
                : target.endsWith(".ts")
                  ? ts.Extension.Ts
                  : target.endsWith(".jsx")
                    ? ts.Extension.Jsx
                    : ts.Extension.Js,
            }
          : undefined;
      }),
  };
  const program = ts.createProgram(
      [...sources.keys()],
      { noLib: true, allowJs: true, jsx: ts.JsxEmit.ReactJSX },
      host,
    ),
    checker = program.getTypeChecker();
  const symbols: SymbolInfo[] = [],
    edges: Analysis["edges"] = [],
    facts: NonNullable<Analysis["facts"]> = [],
    diagnostics: string[] = [];
  function resolve(from: string, spec: string) {
    if (!spec.startsWith(".")) return;
    const parts = from.split("/").slice(0, -1);
    for (const p of spec.split("/")) {
      if (p === "..") parts.pop();
      else if (p !== ".") parts.push(p);
    }
    const root = parts.join("/");
    return [
      root,
      ...[
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        "/index.ts",
        "/index.tsx",
        "/index.js",
        "/index.jsx",
      ].map((e) => root + e),
    ].find((p) => sources.has(p));
  }
  for (const [path, sf] of sources) {
    for (const d of program.getSyntacticDiagnostics(sf).slice(0, 15))
      diagnostics.push(
        `${path}:${sf.getLineAndCharacterOfPosition(d.start ?? 0).line + 1}: ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`,
      );
    const visit = (node: ts.Node) => {
      const fact = (kind: string, detail: string) => {
        if (facts.length < 1000)
          facts.push({
            file: path,
            line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
            kind,
            detail: detail.slice(0, 400),
          });
      };
      if (ts.isVariableDeclaration(node))
        fact(
          "Variable",
          `Declares ${node.name.getText(sf)}${node.type ? `: ${node.type.getText(sf)}` : ""}.`,
        );
      if (ts.isTryStatement(node))
        fact(
          "Error handling",
          `Try block${node.catchClause ? " with a catch handler" : ""}${node.finallyBlock ? " and cleanup in finally" : ""}.`,
        );
      if (ts.isThrowStatement(node))
        fact("Error handling", `Throws ${node.expression.getText(sf)}.`);
      if (ts.isCallExpression(node)) {
        const call = node.expression.getText(sf);
        const stateHook = reactStateHook(node, checker);
        if (stateHook)
          fact(
            "State",
            `${call} is imported React ${stateHook}; source arguments: ${node.arguments.map((a) => a.getText(sf)).join(", ")}. Current state values require an interactive preview.`,
          );
        if (
          call === "fetch" ||
          /^(axios|\w+Client)\.(get|post|put|delete|patch)$/.test(call)
        )
          fact(
            "HTTP",
            `Source calls ${call} with ${node.arguments[0]?.getText(sf) ?? "no argument"}. This is not an observed request.`,
          );
        if (/\.(from|query|collection|findMany|findUnique)$/.test(call))
          fact(
            "Storage candidate",
            `${call} appears in source. Confirm the imported client before inferring a database relationship.`,
          );
        if (/\bauth\.|signIn|signOut|useSession|getSession/.test(call))
          fact(
            "Authentication candidate",
            `Source calls ${call}; provider behavior requires runtime verification.`,
          );
        if (/^(test|it|describe)(\.(skip|only))?$/.test(call))
          fact(
            "Test declaration",
            `${call}(${node.arguments[0]?.getText(sf) ?? ""}). The test has not been run by the indexer.`,
          );
        if (/^(createRoot|ReactDOM\.createRoot)$/.test(call))
          fact(
            "Entry point",
            `Creates a React root at ${node.arguments[0]?.getText(sf) ?? "an expression"}.`,
          );
      }
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        node.tagName.getText(sf) === "Route"
      ) {
        const route = node.attributes.properties.find(
          (a) => ts.isJsxAttribute(a) && a.name.getText(sf) === "path",
        );
        if (route)
          fact(
            "Routing candidate",
            `Route JSX contains ${route.getText(sf)}. Confirm the Route import to identify the router.`,
          );
      }
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const target = resolve(path, node.moduleSpecifier.text);
        if (target)
          edges.push({
            source: path,
            target,
            kind: "imports",
            evidence: "static",
          });
      }
      let name: string | undefined,
        kind: SymbolInfo["kind"] = "function",
        fn: ts.FunctionLikeDeclaration | undefined;
      if (ts.isFunctionDeclaration(node) && node.name) {
        name = node.name.text;
        fn = node;
      } else if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) ||
          ts.isFunctionExpression(node.initializer))
      ) {
        name = node.name.text;
        fn = node.initializer;
      } else if (ts.isClassDeclaration(node) && node.name) {
        name = node.name.text;
        kind = "class";
      } else if (ts.isInterfaceDeclaration(node)) {
        name = node.name.text;
        kind = "interface";
      } else if (ts.isTypeAliasDeclaration(node)) {
        name = node.name.text;
        kind = "type";
      } else if (ts.isMethodDeclaration(node)) {
        name = node.name.getText(sf);
        kind = "method";
        fn = node;
      }
      if (name && symbols.length < 1500) {
        const start = node.getStart(sf),
          end = node.end,
          calls = new Set<string>(),
          concepts = new Set<string>(),
          external = new Set<string>();
        let jsx = false,
          unsupported = false;
        const steps: { line: number; text: string }[] = [];
        const walk = (n: ts.Node) => {
          if (
            ts.isJsxElement(n) ||
            ts.isJsxSelfClosingElement(n) ||
            ts.isJsxFragment(n)
          ) {
            jsx = true;
            concepts.add("JSX");
          }
          if (ts.isAwaitExpression(n)) {
            concepts.add("Async code");
            unsupported = true;
          }
          if (n.kind === ts.SyntaxKind.ThisKeyword || ts.isNewExpression(n))
            unsupported = true;
          if (ts.isCallExpression(n)) {
            const c = n.expression.getText(sf);
            calls.add(c);
            if (/^use[A-Z]/.test(c)) concepts.add("Hooks");
            if (reactStateHook(n, checker)) concepts.add("State");
            if (c === "fetch") concepts.add("HTTP");
          }
          if (ts.isIfStatement(n) || ts.isConditionalExpression(n))
            concepts.add("Control flow");
          if (ts.isReturnStatement(n)) {
            concepts.add("Return values");
            steps.push({
              line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
              text: `Returns ${n.expression ? describeExpression(n.expression, sf) : "undefined"} when this statement is reached.`,
            });
          }
          if (ts.isIfStatement(n))
            steps.push({
              line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
              text: `Checks ${n.expression.getText(sf)} (${describeExpression(n.expression, sf)}); enters the first branch when the condition is truthy${n.elseStatement ? ", otherwise enters the else branch" : ""}.`,
            });
          if (ts.isVariableDeclaration(n) && n.initializer)
            steps.push({
              line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
              text: `Initializes ${n.name.getText(sf)} from ${describeExpression(n.initializer, sf)}.`,
            });
          if (ts.isIdentifier(n)) {
            const s = checker.getSymbolAtLocation(n);
            const decl = s?.declarations;
            const property =
              (ts.isPropertyAccessExpression(n.parent) &&
                n.parent.name === n) ||
              (ts.isPropertyAssignment(n.parent) && n.parent.name === n) ||
              (ts.isPropertySignature(n.parent) && n.parent.name === n);
            if (
              !property &&
              !libs.has(n.text) &&
              n.text !== name &&
              (!decl ||
                decl.some(
                  (d) =>
                    d.getSourceFile() !== sf || d.pos < node.pos || d.end > end,
                ))
            )
              external.add(n.text);
          }
          ts.forEachChild(n, walk);
        };
        if (fn?.body) {
          walk(fn.body);
          if (!ts.isBlock(fn.body))
            steps.unshift({
              line:
                sf.getLineAndCharacterOfPosition(fn.body.getStart(sf)).line + 1,
              text: `Implicitly returns ${describeExpression(fn.body, sf)}.`,
            });
        }
        if (jsx && kind === "function") kind = "component";
        if (fn?.parameters.some((p) => p.type)) concepts.add("Types");
        const params =
          fn?.parameters.map((p) => ({
            name: p.name.getText(sf),
            type: p.type?.getText(sf) ?? "unknown",
            declaration: p.getText(sf),
          })) ?? [];
        const simpleParams =
          !!fn &&
          fn.parameters.length <= 3 &&
          fn.parameters.every(
            (p) =>
              ts.isIdentifier(p.name) &&
              !p.dotDotDotToken &&
              !!p.type &&
              parameterValues(p.type, checker) !== null,
          );
        const topLevel = ts.isFunctionDeclaration(node)
          ? ts.isSourceFile(node.parent)
          : ts.isVariableDeclaration(node) &&
            ts.isVariableDeclarationList(node.parent) &&
            ts.isVariableStatement(node.parent.parent) &&
            ts.isSourceFile(node.parent.parent.parent);
        const standalone =
          !!fn?.body &&
          kind === "function" &&
          topLevel &&
          simpleParams &&
          !jsx &&
          !unsupported &&
          !external.size &&
          !fn.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
        const reason = standalone
          ? undefined
          : !fn
            ? "This declaration is for study, not executable practice."
            : jsx
              ? "Exported components can use separate initial-render checks when their props and dependencies are supported."
              : !simpleParams
                ? "Behavioral probes support up to three explicitly typed scalar, literal-union, scalar-array, fixed-tuple or small inline object parameters. Nested objects, named types and rest parameters need a custom harness."
                : external.size
                  ? `Requires external context: ${[...external].slice(0, 5).join(", ")}.`
                  : "This function requires a project runtime or unsupported syntax.";
        symbols.push({
          id: `${path}#${name}:${start}`,
          name,
          file: path,
          kind,
          start,
          end,
          line: sf.getLineAndCharacterOfPosition(start).line + 1,
          endLine: sf.getLineAndCharacterOfPosition(end).line + 1,
          code: node.getText(sf),
          parameters: params,
          calls: [...calls],
          concepts: [...concepts],
          standalone,
          reason,
          steps: steps.slice(0, 30),
          exported:
            node.getText(sf).startsWith("export ") ||
            !!(
              ts.isVariableDeclaration(node) &&
              node.parent.parent.getText(sf).startsWith("export ")
            ),
        });
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  // Traverse each file once for references, instead of once per declaration.
  // Preserve nested-declaration ownership and deterministic edge ordering.
  const declarations = new Map(
    symbols.map((s) => [JSON.stringify([s.file, s.start]), s]),
  );
  const references = new Map<string, Analysis["edges"]>();
  const seen = new Map<string, Set<string>>();
  for (const [path, sf] of sources) {
    const owners = symbols.filter((s) => s.file === path);
    const visit = (n: ts.Node) => {
      if (
        ts.isCallExpression(n) ||
        ts.isJsxOpeningElement(n) ||
        ts.isJsxSelfClosingElement(n)
      ) {
        const reference = ts.isCallExpression(n) ? n.expression : n.tagName;
        let s = checker.getSymbolAtLocation(reference);
        if (s && s.flags & ts.SymbolFlags.Alias)
          s = checker.getAliasedSymbol(s);
        for (const d of (s?.declarations ?? []).filter(
          (d) =>
            (s?.declarations?.length ?? 0) === 1 || d.getSourceFile() === sf,
        )) {
          const target = declarations.get(
            JSON.stringify([d.getSourceFile().fileName, d.getStart()]),
          );
          if (!target) continue;
          const start = n.getStart(sf);
          for (const sym of owners) {
            if (start < sym.start || n.end > sym.end || target.id === sym.id)
              continue;
            const targets = seen.get(sym.id) ?? new Set<string>();
            if (targets.has(target.id)) continue;
            targets.add(target.id);
            seen.set(sym.id, targets);
            const links = references.get(sym.id) ?? [];
            links.push({
              source: sym.id,
              target: target.id,
              kind: ts.isCallExpression(n) ? "calls" : "renders",
              evidence: "static",
            });
            references.set(sym.id, links);
          }
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  for (const sym of symbols) edges.push(...(references.get(sym.id) ?? []));
  let dependencies: Record<string, string> = {};
  try {
    const p = JSON.parse(
      files.find((f) => f.path === "package.json")?.content ?? "{}",
    );
    dependencies = { ...p.dependencies, ...p.devDependencies };
  } catch {
    diagnostics.push("package.json could not be parsed.");
  }
  return {
    symbols,
    edges,
    dependencies,
    framework: dependencies.next
      ? "Next.js"
      : dependencies.react
        ? "React"
        : symbols.some((s) => s.kind === "component")
          ? "JSX project"
          : "JavaScript / TypeScript",
    diagnostics,
    files: sources.size,
    facts,
    stateFlow: stateRelations(sources, checker),
  };
}
