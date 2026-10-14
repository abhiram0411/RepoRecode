import ts from "typescript";
import type { SourceFile, SymbolInfo } from "./types";
export type SourcePatch = { symbol: SymbolInfo; code: string };
export function patchSource(files: SourceFile[], patch?: SourcePatch) {
  if (!patch)
    return { files, originalLine: (_file: string, line: number) => line };
  const { symbol, code } = patch;
  const file = files.find((f) => f.path === symbol.file);
  if (!file || file.content.slice(symbol.start, symbol.end) !== symbol.code)
    throw Error("Source snapshot changed. Reopen this lesson.");
  if (code.length > 16000)
    throw Error("Practice code exceeds 16,000 characters.");
  const source = ts.createSourceFile(
    symbol.file,
    file.content,
    ts.ScriptTarget.Latest,
    true,
  );
  let variable = false;
  function find(n: ts.Node) {
    if (
      n.getStart(source) === symbol.start &&
      n.end === symbol.end &&
      ts.isVariableDeclaration(n)
    )
      variable = true;
    ts.forEachChild(n, find);
  }
  find(source);
  let replacement = code;
  if (variable) {
    const candidate = ts.createSourceFile(
      "candidate.ts",
      code,
      ts.ScriptTarget.Latest,
      true,
    );
    const statement = candidate.statements[0];
    if (candidate.statements.length !== 1)
      throw Error("Replace only the selected function.");
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === symbol.name &&
      statement.body
    ) {
      replacement = `${symbol.name} = ${ts.createPrinter().printNode(ts.EmitHint.Unspecified, ts.factory.createFunctionExpression(undefined, statement.asteriskToken, undefined, statement.typeParameters, statement.parameters, statement.type, statement.body), candidate)}`;
    } else if (
      ts.isVariableStatement(statement) &&
      statement.declarationList.declarations.length === 1 &&
      statement.declarationList.declarations[0].name.getText(candidate) ===
        symbol.name
    ) {
      replacement =
        statement.declarationList.declarations[0].getText(candidate);
    } else if (
      !code.trim().startsWith(`${symbol.name} =`) &&
      !code.trim().startsWith(`${symbol.name}=`)
    )
      throw Error("Keep the selected declaration's name.");
  } else if (/^export\s/.test(symbol.code) && !/^\s*export\b/.test(code)) {
    replacement =
      (/^export\s+default/.test(symbol.code) ? "export default " : "export ") +
      code;
  }
  const lineStart = file.content.slice(0, symbol.start).split("\n").length;
  const oldLines = symbol.code.split("\n").length - 1,
    newLines = replacement.split("\n").length - 1;
  return {
    files: files.map((f) =>
      f !== file
        ? f
        : {
            ...f,
            content:
              f.content.slice(0, symbol.start) +
              replacement +
              f.content.slice(symbol.end),
          },
    ),
    originalLine: (path: string, line: number) =>
      path !== file.path || line < lineStart
        ? line
        : line <= lineStart + newLines
          ? Math.min(lineStart + oldLines, line)
          : line - newLines + oldLines,
  };
}
