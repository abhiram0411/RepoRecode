import ts from "typescript";
import type { SourceFile } from "./types";

export type HookSite = { hook: "useState" | "useReducer"; label: string };

function fromReact(node: ts.Node): boolean {
  while (!ts.isImportDeclaration(node) && node.parent) node = node.parent;
  return (
    ts.isImportDeclaration(node) &&
    ts.isStringLiteral(node.moduleSpecifier) &&
    node.moduleSpecifier.text === "react" &&
    !node.importClause?.isTypeOnly
  );
}

export function reactStateHook(
  node: ts.CallExpression,
  checker: ts.TypeChecker,
): HookSite["hook"] | undefined {
  let hook: string | undefined;
  if (ts.isIdentifier(node.expression)) {
    const decl = checker.getSymbolAtLocation(node.expression)
      ?.declarations?.[0];
    if (
      decl &&
      ts.isImportSpecifier(decl) &&
      !decl.isTypeOnly &&
      fromReact(decl)
    )
      hook = (decl.propertyName ?? decl.name).text;
  } else if (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression)
  ) {
    const decl = checker.getSymbolAtLocation(node.expression.expression)
      ?.declarations?.[0];
    if (
      decl &&
      (ts.isImportClause(decl) || ts.isNamespaceImport(decl)) &&
      fromReact(decl)
    )
      hook = node.expression.name.text;
  }
  return hook === "useState" || hook === "useReducer" ? hook : undefined;
}

/** Bind names before transforming: a shadowed `useState` is not a React hook. */
export function hookSites(file: SourceFile): Map<number, HookSite> {
  const sites = new Map<number, HookSite>();
  const source = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
  );
  const host: ts.CompilerHost = {
    getSourceFile: (name) => (name === file.path ? source : undefined),
    getDefaultLibFileName: () => "",
    writeFile: () => {},
    getCurrentDirectory: () => "",
    getDirectories: () => [],
    fileExists: (name) => name === file.path,
    readFile: (name) => (name === file.path ? file.content : undefined),
    getCanonicalFileName: (name) => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => "\n",
  };
  const program = ts.createProgram(
    [file.path],
    { noLib: true, noResolve: true, allowJs: true },
    host,
  );
  const checker = program.getTypeChecker();
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const hook = reactStateHook(node, checker);
      if (hook) {
        const parent = node.parent;
        const label =
          ts.isVariableDeclaration(parent) &&
          ts.isArrayBindingPattern(parent.name)
            ? parent.name.elements[0]?.getText(source) || hook
            : hook;
        sites.set(node.getStart(source), { hook, label: label.slice(0, 100) });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return sites;
}
