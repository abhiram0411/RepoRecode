import ts from "typescript";

export function resolveSource(
  sources: Map<string, ts.SourceFile>,
  from: string,
  spec: string,
) {
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

// Invalidate both old and new dependency graphs: removals and resolution shadowing
// must refresh unchanged importers. Global scripts/augmentation fall back to a
// full rebuild because their effects are not confined to explicit imports.
export function reusableSemanticFiles(
  current: Map<string, ts.SourceFile>,
  previous: Map<string, ts.SourceFile>,
) {
  const dirty = new Set<string>();
  for (const [path, sf] of current)
    if (previous.get(path) !== sf) dirty.add(path);
  for (const path of previous.keys()) if (!current.has(path)) dirty.add(path);
  const reordered =
    JSON.stringify([...current.keys()]) !==
    JSON.stringify([...previous.keys()]);
  const reverse = new Map<string, Set<string>>();
  let global = false;
  for (const snapshot of [previous, current])
    for (const [path, sf] of snapshot) {
      if (
        !ts.isExternalModule(sf) ||
        sf.referencedFiles.length ||
        sf.typeReferenceDirectives.length
      )
        global = true;
      const visit = (node: ts.Node) => {
        if (ts.isModuleDeclaration(node)) global = true;
        let spec: string | undefined;
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          spec = node.moduleSpecifier.text;
        if (
          ts.isImportEqualsDeclaration(node) &&
          ts.isExternalModuleReference(node.moduleReference) &&
          node.moduleReference.expression &&
          ts.isStringLiteral(node.moduleReference.expression)
        )
          spec = node.moduleReference.expression.text;
        if (
          ts.isImportTypeNode(node) &&
          ts.isLiteralTypeNode(node.argument) &&
          ts.isStringLiteral(node.argument.literal)
        )
          spec = node.argument.literal.text;
        if (
          ts.isCallExpression(node) &&
          (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
            (ts.isIdentifier(node.expression) &&
              node.expression.text === "require")) &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        )
          spec = node.arguments[0].text;
        const target = spec && resolveSource(snapshot, path, spec);
        if (target) {
          const users = reverse.get(target) ?? new Set<string>();
          users.add(path);
          reverse.set(target, users);
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }
  if (global && (dirty.size || reordered)) return new Set<string>();
  const queue = [...dirty];
  for (let i = 0; i < queue.length; i++)
    for (const user of reverse.get(queue[i]) ?? [])
      if (!dirty.has(user)) {
        dirty.add(user);
        queue.push(user);
      }
  return new Set([...current.keys()].filter((path) => !dirty.has(path)));
}
