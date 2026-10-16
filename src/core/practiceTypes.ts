import ts from "typescript";

// Resolve only finite data syntax from the imported source, never runtime values.
// Expansion is bounded independently of the exercise's input/sample limits.
export function expandPracticeType(
  type: ts.TypeNode,
  checker: ts.TypeChecker,
): string | null {
  let remaining = 256;
  const active = new Set<ts.Symbol>();
  function expand(node: ts.TypeNode, depth: number): string | null {
    if (--remaining < 0 || depth > 8) return null;
    if (ts.isTypeReferenceNode(node)) {
      if (!ts.isIdentifier(node.typeName)) return null;
      let symbol = checker.getSymbolAtLocation(node.typeName);
      if (["Array", "ReadonlyArray"].includes(node.typeName.text)) {
        if (symbol?.declarations?.length || node.typeArguments?.length !== 1)
          return null;
        const element = expand(node.typeArguments[0], depth + 1);
        return element === null ? null : `${node.typeName.text}<${element}>`;
      }
      if (node.typeArguments?.length || !symbol) return null;
      if (symbol.flags & ts.SymbolFlags.Alias)
        symbol = checker.getAliasedSymbol(symbol);
      if (active.has(symbol) || symbol.declarations?.length !== 1) return null;
      const declaration = symbol.declarations[0];
      if (
        !(
          ts.isTypeAliasDeclaration(declaration) ||
          ts.isInterfaceDeclaration(declaration)
        ) ||
        declaration.typeParameters?.length
      )
        return null;
      active.add(symbol);
      let result: string | null;
      if (ts.isTypeAliasDeclaration(declaration))
        result = expand(declaration.type, depth + 1);
      else {
        const members = interfaceMembers(declaration, depth + 1);
        result = members === null ? null : object(members, depth + 1);
      }
      active.delete(symbol);
      return result;
    }
    if (ts.isParenthesizedTypeNode(node)) {
      const value = expand(node.type, depth + 1);
      return value === null ? null : `(${value})`;
    }
    if (
      ts.isTypeOperatorNode(node) &&
      node.operator === ts.SyntaxKind.ReadonlyKeyword
    ) {
      const value = expand(node.type, depth + 1);
      return value === null ? null : `readonly ${value}`;
    }
    if (ts.isArrayTypeNode(node)) {
      const value = expand(node.elementType, depth + 1);
      return value === null ? null : `(${value})[]`;
    }
    if (ts.isUnionTypeNode(node) || ts.isTupleTypeNode(node)) {
      const children = ts.isUnionTypeNode(node) ? node.types : node.elements;
      if (children.length > 16) return null;
      const values = children.map((child) => {
        if (ts.isNamedTupleMember(child)) {
          if (child.questionToken || child.dotDotDotToken) return null;
          return expand(child.type, depth + 1);
        }
        return expand(child, depth + 1);
      });
      if (values.some((v) => v === null)) return null;
      return ts.isUnionTypeNode(node)
        ? values.join(" | ")
        : `[${values.join(", ")}]`;
    }
    if (ts.isTypeLiteralNode(node)) return object(node.members, depth + 1);
    if (
      ts.isLiteralTypeNode(node) ||
      [
        ts.SyntaxKind.NumberKeyword,
        ts.SyntaxKind.StringKeyword,
        ts.SyntaxKind.BooleanKeyword,
        ts.SyntaxKind.UndefinedKeyword,
        ts.SyntaxKind.VoidKeyword,
      ].includes(node.kind)
    )
      return node.getText();
    return null;
  }
  // Flatten only unambiguous interface inheritance. Duplicate/overridden fields,
  // merged declarations, generics and qualified bases need a richer type harness.
  function interfaceMembers(
    declaration: ts.InterfaceDeclaration,
    depth: number,
  ): ts.TypeElement[] | null {
    if (--remaining < 0 || depth > 8) return null;
    const members: ts.TypeElement[] = [];
    for (const clause of declaration.heritageClauses ?? []) {
      if (clause.token !== ts.SyntaxKind.ExtendsKeyword) return null;
      for (const base of clause.types) {
        if (base.typeArguments?.length || !ts.isIdentifier(base.expression))
          return null;
        let symbol = checker.getSymbolAtLocation(base.expression);
        if (!symbol) return null;
        if (symbol.flags & ts.SymbolFlags.Alias)
          symbol = checker.getAliasedSymbol(symbol);
        if (active.has(symbol) || symbol.declarations?.length !== 1)
          return null;
        const inherited = symbol.declarations[0];
        if (
          !ts.isInterfaceDeclaration(inherited) ||
          inherited.typeParameters?.length
        )
          return null;
        active.add(symbol);
        const inheritedMembers = interfaceMembers(inherited, depth + 1);
        active.delete(symbol);
        if (inheritedMembers === null) return null;
        members.push(...inheritedMembers);
        if (members.length > 3) return null;
      }
    }
    members.push(...declaration.members);
    return members.length <= 3 ? members : null;
  }
  function object(
    members: readonly ts.TypeElement[],
    depth: number,
  ): string | null {
    if (members.length > 3) return null;
    const names = new Set<string>();
    const fields: string[] = [];
    for (const member of members) {
      if (
        !ts.isPropertySignature(member) ||
        !member.type ||
        !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
      )
        return null;
      if (names.has(member.name.text) || member.name.text.length > 100)
        return null;
      names.add(member.name.text);
      const value = expand(member.type, depth + 1);
      if (value === null) return null;
      fields.push(
        `${member.modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword) ? "readonly " : ""}${JSON.stringify(member.name.text)}${member.questionToken ? "?" : ""}: ${value}`,
      );
    }
    return `{ ${fields.join("; ")} }`;
  }
  const text = expand(type, 0);
  return text !== null && text.length <= 4096 ? text : null;
}

// Retain the source's names in the exercise, with a read-only type context.
// Body-local aliases, generic parameters and namespace-qualified names are not
// flattened: their scope/merge semantics need a more complete project harness.
export function practiceTypeContext(
  fn: ts.FunctionLikeDeclaration,
  checker: ts.TypeChecker,
): string | null {
  if (fn.typeParameters?.length) return null;
  const aliases = new Map<string, string>();
  let valid = true;
  function visit(node: ts.Node) {
    if (ts.isTypeReferenceNode(node)) {
      const expanded = expandPracticeType(node, checker);
      if (expanded === null || !ts.isIdentifier(node.typeName)) {
        valid = false;
        return;
      }
      const name = node.typeName.text;
      if (!["Array", "ReadonlyArray"].includes(name)) {
        if (aliases.has(name) && aliases.get(name) !== expanded) valid = false;
        aliases.set(name, expanded);
      }
    }
    ts.forEachChild(node, visit);
  }
  fn.parameters.forEach((p) => {
    if (p.type) visit(p.type);
  });
  if (fn.type) visit(fn.type);
  const context = [...aliases]
    .map(([name, type]) => `type ${name} = ${type};`)
    .join("\n");
  return valid && aliases.size <= 16 && context.length <= 8192 ? context : null;
}
