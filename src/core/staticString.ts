import ts from "typescript";

// Resolve only bounded string syntax and immutable string bindings. Never run
// imported code, call getters/functions or infer values from TypeScript types.
export function staticString(
  node: ts.Node | undefined,
  checker: ts.TypeChecker,
): string | undefined {
  let remaining = 64;
  const active = new Set<ts.Symbol>();
  function visit(
    value: ts.Node | undefined,
    depth: number,
  ): string | undefined {
    if (!value || --remaining < 0 || depth > 8) return;
    let result: string | undefined;
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
      result = value.text;
    else if (
      ts.isParenthesizedExpression(value) ||
      ts.isAsExpression(value) ||
      ts.isTypeAssertionExpression(value) ||
      ts.isSatisfiesExpression(value)
    )
      result = visit(value.expression, depth + 1);
    else if (ts.isIdentifier(value)) {
      let symbol = checker.getSymbolAtLocation(value);
      if (!symbol) return;
      const aliases = new Set<ts.Symbol>();
      while (symbol.flags & ts.SymbolFlags.Alias) {
        if (--remaining < 0 || aliases.size >= 8 || aliases.has(symbol)) return;
        aliases.add(symbol);
        const declarations = symbol.declarations ?? [];
        if (
          declarations.some(
            (decl) =>
              (ts.isImportSpecifier(decl) &&
                (decl.isTypeOnly || decl.parent.parent.isTypeOnly)) ||
              (ts.isImportClause(decl) && decl.isTypeOnly) ||
              (ts.isExportSpecifier(decl) &&
                (decl.isTypeOnly || decl.parent.parent.isTypeOnly)),
          )
        )
          return;
        const target = checker.getImmediateAliasedSymbol(symbol);
        if (!target) return;
        symbol = target;
      }
      if (active.has(symbol) || symbol.declarations?.length !== 1) return;
      const decl = symbol.declarations[0];
      if (
        !ts.isVariableDeclaration(decl) ||
        !ts.isIdentifier(decl.name) ||
        !ts.isVariableDeclarationList(decl.parent) ||
        !(decl.parent.flags & ts.NodeFlags.Const) ||
        !decl.initializer
      )
        return;
      active.add(symbol);
      result = visit(decl.initializer, depth + 1);
      active.delete(symbol);
    } else if (
      ts.isBinaryExpression(value) &&
      value.operatorToken.kind === ts.SyntaxKind.PlusToken
    ) {
      const left = visit(value.left, depth + 1),
        right = visit(value.right, depth + 1);
      if (left !== undefined && right !== undefined) result = left + right;
    } else if (ts.isTemplateExpression(value)) {
      result = value.head.text;
      for (const span of value.templateSpans) {
        const text = visit(span.expression, depth + 1);
        if (text === undefined) return;
        result += text + span.literal.text;
        if (result.length > 300) return;
      }
    }
    return result !== undefined && result.length <= 300 ? result : undefined;
  }
  return visit(node, 0);
}
