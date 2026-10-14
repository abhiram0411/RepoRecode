import ts from "typescript";
/** Bounded explanations of syntax. Never executes source or invents business intent. */
export function describeExpression(
  node: ts.Expression,
  source: ts.SourceFile,
  depth = 0,
): string {
  const text = () => node.getText(source).slice(0, 240);
  if (depth > 4) return text();
  const describe = (n: ts.Expression) =>
    describeExpression(n, source, depth + 1);
  if (ts.isParenthesizedExpression(node)) return describe(node.expression);
  if (ts.isBinaryExpression(node)) {
    const left = describe(node.left),
      right = describe(node.right);
    const operators: Partial<Record<ts.SyntaxKind, string>> = {
      [ts.SyntaxKind.AsteriskToken]: "multiplied by",
      [ts.SyntaxKind.SlashToken]: "divided by",
      [ts.SyntaxKind.MinusToken]: "minus",
      [ts.SyntaxKind.PercentToken]: "remainder after division by",
      [ts.SyntaxKind.LessThanToken]: "is less than",
      [ts.SyntaxKind.LessThanEqualsToken]: "is at most",
      [ts.SyntaxKind.GreaterThanToken]: "is greater than",
      [ts.SyntaxKind.GreaterThanEqualsToken]: "is at least",
      [ts.SyntaxKind.EqualsEqualsEqualsToken]: "is strictly equal to",
      [ts.SyntaxKind.ExclamationEqualsEqualsToken]: "is not strictly equal to",
    };
    if (operators[node.operatorToken.kind])
      return `(${left} ${operators[node.operatorToken.kind]} ${right})`;
    if (node.operatorToken.kind === ts.SyntaxKind.PlusToken)
      return `(${left} + ${right}: numeric addition or string concatenation, depending on the values)`;
    if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)
      return `the first falsy value of ${left} and ${right}, or ${right} if both are truthy`;
    if (node.operatorToken.kind === ts.SyntaxKind.BarBarToken)
      return `${left} when truthy, otherwise ${right}`;
    if (node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken)
      return `${left} unless null or undefined, otherwise ${right}`;
  }
  if (ts.isConditionalExpression(node))
    return `${describe(node.whenTrue)} when ${describe(node.condition)} is truthy; otherwise ${describe(node.whenFalse)}`;
  if (ts.isArrayLiteralExpression(node))
    return `an array with ${node.elements.length} syntactic entries${node.elements.some(ts.isSpreadElement) ? " (spreads may expand its length)" : ""}`;
  if (ts.isObjectLiteralExpression(node))
    return `an object initialized by ${node.properties.length} property definitions or spreads`;
  if (ts.isCallExpression(node))
    return `the result of calling ${node.expression.getText(source)} with ${node.arguments.length ? node.arguments.map((a) => describe(a)).join(", ") : "no arguments"}`;
  if (ts.isAwaitExpression(node))
    return `the fulfilled value of ${describe(node.expression)}; rejection throws at this point`;
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.ExclamationToken
  )
    return `the boolean negation of ${describe(node.operand)}`;
  return text();
}
