import ts from "typescript";
import type { StateRelation } from "./types";

export type StateOrigin = {
  state: StateRelation["state"];
  via: NonNullable<StateRelation["via"]>;
};
export function containingFunction(node: ts.Node): ts.Node | undefined {
  for (let parent = node.parent; parent; parent = parent.parent)
    if (ts.isFunctionLike(parent)) return parent;
}

// Trace only lexical references through two const initializers in the same
// function, including static property/index reads. Calls, object construction,
// dynamic indexes, closures and mutation are excluded; getters are not invoked.
// A chain is source evidence, never an evaluated value or runtime data flow.
export function stateDerivations(
  sources: Map<string, ts.SourceFile>,
  checker: ts.TypeChecker,
  states: Map<ts.Symbol, StateRelation["state"]>,
): Map<ts.Symbol, StateOrigin[]> {
  const owners = new Map<StateRelation["state"], ts.Node | undefined>();
  const direct = new Map<ts.Symbol, StateOrigin[]>();
  for (const [symbol, state] of states) {
    owners.set(state, containingFunction(symbol.declarations![0]));
    direct.set(symbol, [{ state, via: [] }]);
  }
  const candidates: {
    symbol: ts.Symbol;
    node: ts.VariableDeclaration;
    file: string;
    line: number;
    refs: ts.Symbol[];
  }[] = [];
  for (const [file, source] of sources) {
    function visit(node: ts.Node) {
      if (candidates.length >= 200) return;
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isVariableDeclarationList(node.parent) &&
        node.parent.flags & ts.NodeFlags.Const
      ) {
        const refs = new Set<ts.Symbol>();
        let nodes = 0;
        function expression(e: ts.Expression, depth = 0): boolean {
          if (++nodes > 128 || depth > 12) return false;
          const next = (value: ts.Expression) => expression(value, depth + 1);
          if (ts.isIdentifier(e)) {
            const symbol = checker.getSymbolAtLocation(e);
            if (symbol) refs.add(symbol);
            return true;
          }
          if (
            ts.isLiteralExpression(e) ||
            [
              ts.SyntaxKind.TrueKeyword,
              ts.SyntaxKind.FalseKeyword,
              ts.SyntaxKind.NullKeyword,
            ].includes(e.kind)
          )
            return true;
          if (
            ts.isParenthesizedExpression(e) ||
            ts.isAsExpression(e) ||
            ts.isTypeAssertionExpression(e) ||
            ts.isSatisfiesExpression(e) ||
            ts.isNonNullExpression(e)
          )
            return next(e.expression);
          if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.name))
            return next(e.expression);
          if (
            ts.isElementAccessExpression(e) &&
            (ts.isStringLiteral(e.argumentExpression) ||
              ts.isNumericLiteral(e.argumentExpression))
          )
            return next(e.expression);
          if (
            ts.isPrefixUnaryExpression(e) &&
            [
              ts.SyntaxKind.PlusToken,
              ts.SyntaxKind.MinusToken,
              ts.SyntaxKind.ExclamationToken,
              ts.SyntaxKind.TildeToken,
            ].includes(e.operator)
          )
            return next(e.operand);
          if (
            ts.isBinaryExpression(e) &&
            e.operatorToken.kind >= ts.SyntaxKind.FirstBinaryOperator &&
            e.operatorToken.kind <= ts.SyntaxKind.LastBinaryOperator &&
            !(
              e.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
              e.operatorToken.kind <= ts.SyntaxKind.LastAssignment
            ) &&
            e.operatorToken.kind !== ts.SyntaxKind.CommaToken
          )
            return next(e.left) && next(e.right);
          if (ts.isConditionalExpression(e))
            return next(e.condition) && next(e.whenTrue) && next(e.whenFalse);
          if (ts.isTemplateExpression(e))
            return e.templateSpans.every((span) => next(span.expression));
          return false;
        }
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol && expression(node.initializer))
          candidates.push({
            symbol,
            node,
            file,
            line:
              source.getLineAndCharacterOfPosition(node.getStart(source)).line +
              1,
            refs: [...refs],
          });
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  let known = direct;
  const derived = new Map<ts.Symbol, StateOrigin[]>();
  for (let pass = 0; pass < 2; pass++) {
    const next = new Map(known);
    for (const candidate of candidates) {
      const origins: StateOrigin[] = [];
      const seen = new Set<string>();
      const owner = containingFunction(candidate.node);
      for (const ref of candidate.refs)
        for (const origin of known.get(ref) ?? []) {
          if (
            owners.get(origin.state) !== owner ||
            origin.via.length >= 2 ||
            origin.via.some(
              (v) =>
                v.file === candidate.file &&
                v.line === candidate.line &&
                v.name === candidate.node.name.getText(),
            )
          )
            continue;
          const via = [
            ...origin.via,
            {
              file: candidate.file,
              line: candidate.line,
              name: candidate.node.name.getText(),
            },
          ];
          const key = JSON.stringify([origin.state, via]);
          if (!seen.has(key)) {
            seen.add(key);
            origins.push({ state: origin.state, via });
          }
        }
      // Reject an over-wide chain instead of presenting partial provenance.
      if (origins.length && origins.length <= 8) {
        derived.set(candidate.symbol, origins);
        next.set(candidate.symbol, origins);
      } else {
        derived.delete(candidate.symbol);
        next.delete(candidate.symbol);
      }
    }
    known = next;
  }
  return derived;
}
