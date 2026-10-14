import ts from "typescript";
import { parseFragment } from "parse5";
import { renderPreview } from "./preview";
import type { SourceFile, SymbolInfo, Evaluation } from "./types";
const note =
  "Finite initial-render DOM probes only. Event handlers, later state/effects, stylesheet appearance, accessibility audits and full TypeScript type checking are not evaluated. Matching these samples is not proof of component equivalence.";
export function componentCases(
  files: SourceFile[],
  symbol: SymbolInfo,
): Record<string, unknown>[] {
  if (symbol.kind !== "component" || !symbol.exported)
    throw Error("Choose an exported React component.");
  const file = files.find((f) => f.path === symbol.file);
  if (!file) throw Error("Source file missing.");
  const source = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
  );
  let fn: ts.FunctionLikeDeclaration | undefined;
  function visit(n: ts.Node) {
    if (n.getStart(source) === symbol.start) {
      if (ts.isFunctionDeclaration(n)) fn = n;
      else if (
        ts.isVariableDeclaration(n) &&
        n.initializer &&
        (ts.isArrowFunction(n.initializer) ||
          ts.isFunctionExpression(n.initializer))
      )
        fn = n.initializer;
    }
    ts.forEachChild(n, visit);
  }
  visit(source);
  if (!fn) throw Error("Component declaration not found.");
  if (!fn.parameters.length) return [{}];
  if (fn.parameters.length !== 1)
    throw Error("Component practice supports a single typed props parameter.");
  let type = fn.parameters[0].type;
  if (type && ts.isTypeReferenceNode(type)) {
    const name = type.typeName.getText(source),
      decl = source.statements.find(
        (s) =>
          (ts.isInterfaceDeclaration(s) || ts.isTypeAliasDeclaration(s)) &&
          s.name.text === name,
      );
    if (decl && ts.isTypeAliasDeclaration(decl)) type = decl.type;
    else if (
      decl &&
      ts.isInterfaceDeclaration(decl) &&
      !decl.heritageClauses?.length
    )
      type = ts.factory.createTypeLiteralNode(decl.members);
  }
  if (!type || !ts.isTypeLiteralNode(type) || type.members.length > 5)
    throw Error(
      "Use an inline or same-file props type with at most five primitive fields for component practice.",
    );
  const fields: { name: string; values: unknown[]; optional: boolean }[] = [];
  for (const member of type.members) {
    if (
      !ts.isPropertySignature(member) ||
      !member.type ||
      !member.name ||
      !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
    )
      throw Error(
        "Only named primitive props are supported; callbacks, nested objects and index signatures need a custom harness.",
      );
    const kind = member.type.kind;
    const values =
      kind === ts.SyntaxKind.NumberKeyword
        ? [0, 1, -1, 5]
        : kind === ts.SyntaxKind.StringKeyword
          ? ["", "Hello", "two words"]
          : kind === ts.SyntaxKind.BooleanKeyword
            ? [false, true]
            : null;
    if (!values)
      throw Error(
        "Component practice currently supports number, string and boolean props only.",
      );
    fields.push({
      name: member.name.text,
      values,
      optional: !!member.questionToken,
    });
  }
  const base = Object.fromEntries(fields.map((f) => [f.name, f.values[0]]));
  const populated = Object.fromEntries(
    fields.map((f) => [f.name, f.values[1]]),
  );
  const result: Record<string, unknown>[] = [base];
  if (fields.length) result.push(populated);
  for (const f of fields) {
    if (result.length >= 6) break;
    result.push({ ...populated, [f.name]: f.values[2] ?? f.values[0] });
  }
  if (fields.some((f) => f.optional) && result.length < 6)
    result.push(
      Object.fromEntries(
        fields.filter((f) => !f.optional).map((f) => [f.name, f.values[0]]),
      ),
    );
  return result;
}
function canonical(html: string): string {
  function node(n: any): unknown {
    if (n.nodeName === "#text") return ["text", n.value];
    const attrs = (n.attrs ?? [])
      .filter((a: any) => !a.name.startsWith("data-rr-"))
      .map((a: any) => [
        a.name,
        a.name === "style"
          ? a.value
              .split(";")
              .map((s: string) => s.trim())
              .filter(Boolean)
              .sort()
              .join(";")
          : a.value,
      ])
      .sort((a: string[], b: string[]) => a[0].localeCompare(b[0]));
    return [
      n.tagName ?? "fragment",
      attrs,
      (n.childNodes ?? [])
        .filter((c: any) => c.nodeName !== "#comment")
        .map(node),
    ];
  }
  return JSON.stringify(node(parseFragment(html)));
}
export async function evaluateComponent(
  files: SourceFile[],
  symbol: SymbolInfo,
  code: string,
): Promise<Evaluation> {
  const cases: Evaluation["cases"] = [];
  let inputs: Record<string, unknown>[];
  try {
    inputs = componentCases(files, symbol);
  } catch (e) {
    return {
      supported: false,
      passed: false,
      cases,
      diagnostics: [String(e)],
      note,
    };
  }
  if (code.length > 16000)
    return {
      supported: true,
      passed: false,
      cases,
      diagnostics: ["Practice code exceeds 16,000 characters."],
      note,
    };
  const normalized =
    /^\s*(export\s+)?(default\s+)?(function|const|let|var)\b/.test(code)
      ? code
      : `const ${code};`;
  const candidate = ts.createSourceFile(
      "practice.tsx",
      normalized,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    st = candidate.statements[0];
  const named =
    st && ts.isFunctionDeclaration(st)
      ? st.name?.text
      : st &&
          ts.isVariableStatement(st) &&
          st.declarationList.declarations.length === 1
        ? st.declarationList.declarations[0].name.getText(candidate)
        : undefined;
  if (candidate.statements.length !== 1 || named !== symbol.name)
    return {
      supported: true,
      passed: false,
      cases,
      diagnostics: [
        `Submit only the component declaration named ${symbol.name}.`,
      ],
      note,
    };
  for (const props of inputs) {
    let expected: string;
    const exportName = /^export\s+default\b/.test(symbol.code)
      ? "default"
      : symbol.name;
    try {
      const first = await renderPreview(files, symbol.file, exportName, props),
        second = await renderPreview(files, symbol.file, exportName, props);
      expected = canonical(first.html);
      if (expected !== canonical(second.html))
        throw Error("The reference output changes between identical renders.");
    } catch (e) {
      return {
        supported: false,
        passed: false,
        cases: [],
        diagnostics: [`Reference component cannot be checked: ${String(e)}`],
        note,
      };
    }
    try {
      const output = await renderPreview(
        files,
        symbol.file,
        exportName,
        props,
        { symbol, code },
      );
      const actual = canonical(output.html);
      cases.push({
        input: JSON.stringify(props),
        expected: expected.slice(0, 700),
        actual: actual.slice(0, 700),
        passed: expected === actual,
      });
    } catch (e) {
      cases.push({
        input: JSON.stringify(props),
        expected: expected.slice(0, 700),
        actual: String(e).slice(0, 700),
        passed: false,
      });
      break;
    }
  }
  return {
    supported: true,
    passed: cases.length === inputs.length && cases.every((c) => c.passed),
    cases,
    diagnostics: cases.some((c) => !c.passed)
      ? [
          "Rendered output differs or the draft could not render. Inspect the first failing props sample.",
        ]
      : [],
    note,
  };
}
