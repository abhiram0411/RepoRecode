import ts from "typescript";
import type { SymbolInfo } from "./types";
export function bugChallenge(symbol: SymbolInfo) {
  const sf = ts.createSourceFile(
    "challenge.ts",
    symbol.code,
    ts.ScriptTarget.Latest,
    true,
  );
  let change: { start: number; end: number; replacement: string } | undefined;
  const operators: Partial<Record<ts.SyntaxKind, string>> = {
    [ts.SyntaxKind.AsteriskToken]: "+",
    [ts.SyntaxKind.PlusToken]: "-",
    [ts.SyntaxKind.MinusToken]: "+",
    [ts.SyntaxKind.LessThanEqualsToken]: "<",
    [ts.SyntaxKind.GreaterThanEqualsToken]: ">",
    [ts.SyntaxKind.EqualsEqualsEqualsToken]: "!==",
    [ts.SyntaxKind.ExclamationEqualsEqualsToken]: "===",
  };
  function visit(node: ts.Node) {
    if (!change && ts.isBinaryExpression(node)) {
      const replacement = operators[node.operatorToken.kind];
      if (replacement)
        change = {
          start: node.operatorToken.getStart(sf),
          end: node.operatorToken.end,
          replacement,
        };
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (!change) return null;
  const c = change as { start: number; end: number; replacement: string };
  return (
    symbol.code.slice(0, c.start) + c.replacement + symbol.code.slice(c.end)
  );
}
export function completionChallenge(symbol: SymbolInfo) {
  const sf = ts.createSourceFile(
    "challenge.ts",
    symbol.code,
    ts.ScriptTarget.Latest,
    true,
  );
  let expression: ts.Expression | undefined;
  function visit(n: ts.Node) {
    if (!expression && ts.isReturnStatement(n) && n.expression)
      expression = n.expression;
    ts.forEachChild(n, visit);
  }
  visit(sf);
  if (!expression) return null;
  return (
    symbol.code.slice(0, expression.getStart(sf)) +
    "undefined /* Complete this expression */" +
    symbol.code.slice(expression.end)
  );
}
