import ts from "typescript";

// Compare scalar contracts, not sampled values: a few numeric probes cannot
// establish that `number` satisfies a literal-only constraint such as 1 | 2.
function scalarContract(
  text: string,
): { kind: string; literal?: string }[] | null {
  const file = ts.createSourceFile(
    "constraint.ts",
    `type C = ${text};`,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = file.statements[0];
  if (!declaration || !ts.isTypeAliasDeclaration(declaration)) return null;
  function visit(
    node: ts.TypeNode,
  ): { kind: string; literal?: string }[] | null {
    if (ts.isParenthesizedTypeNode(node)) return visit(node.type);
    if (ts.isUnionTypeNode(node)) {
      const parts = node.types.map(visit);
      return parts.some((part) => part === null)
        ? null
        : parts.flatMap((part) => part!);
    }
    if (node.kind === ts.SyntaxKind.NumberKeyword) return [{ kind: "number" }];
    if (node.kind === ts.SyntaxKind.StringKeyword) return [{ kind: "string" }];
    if (node.kind === ts.SyntaxKind.BooleanKeyword)
      return [
        { kind: "boolean", literal: "true" },
        { kind: "boolean", literal: "false" },
      ];
    if (node.kind === ts.SyntaxKind.UndefinedKeyword)
      return [{ kind: "undefined" }];
    if (!ts.isLiteralTypeNode(node)) return null;
    const value = node.literal;
    if (ts.isStringLiteral(value))
      return [{ kind: "string", literal: value.text }];
    if (ts.isNumericLiteral(value))
      return [{ kind: "number", literal: String(Number(value.text)) }];
    if (
      ts.isPrefixUnaryExpression(value) &&
      value.operator === ts.SyntaxKind.MinusToken &&
      ts.isNumericLiteral(value.operand)
    )
      return [{ kind: "number", literal: String(-Number(value.operand.text)) }];
    if (value.kind === ts.SyntaxKind.NullKeyword) return [{ kind: "null" }];
    if (
      value.kind === ts.SyntaxKind.TrueKeyword ||
      value.kind === ts.SyntaxKind.FalseKeyword
    )
      return [
        {
          kind: "boolean",
          literal: value.kind === ts.SyntaxKind.TrueKeyword ? "true" : "false",
        },
      ];
    return null;
  }
  const result = visit(declaration.type);
  return result && result.length <= 16 ? result : null;
}

function satisfiesScalarConstraint(value: string, constraint: string): boolean {
  const actual = scalarContract(value),
    allowed = scalarContract(constraint);
  return (
    !!actual &&
    !!allowed &&
    actual.every((atom) =>
      allowed.some(
        (bound) =>
          atom.kind === bound.kind &&
          (bound.literal === undefined || atom.literal === bound.literal),
      ),
    )
  );
}

// Resolve only finite data syntax from the imported source, never runtime values.
// Expansion is bounded independently of the exercise's input/sample limits.
export function expandPracticeType(
  type: ts.TypeNode,
  checker: ts.TypeChecker,
  template = false,
  parameters: readonly ts.TypeParameterDeclaration[] = [],
): string | null {
  let remaining = 256;
  const active = new Set<ts.Symbol>();
  let bindings = new Map<ts.Symbol, string>();
  for (const parameter of parameters) {
    const symbol = checker.getSymbolAtLocation(parameter.name);
    if (!symbol) return null;
    bindings.set(symbol, parameter.name.text);
  }
  type Member = { node: ts.TypeElement; bindings: Map<ts.Symbol, string> };
  function bind(
    declaration: ts.TypeAliasDeclaration | ts.InterfaceDeclaration,
    args: readonly ts.TypeNode[],
    depth: number,
    placeholders = false,
  ): Map<ts.Symbol, string> | null {
    const params = declaration.typeParameters ?? [];
    if (
      params.length > 3 ||
      args.length > params.length ||
      params.some(
        (p, i) =>
          p.modifiers?.length ||
          (!p.default &&
            (i >= args.length ||
              params.slice(0, i).some((earlier) => earlier.default))),
      )
    )
      return null;
    const next = new Map(bindings);
    for (let i = 0; i < params.length; i++) {
      const symbol = checker.getSymbolAtLocation(params[i].name);
      let value: string | null;
      if (placeholders) value = params[i].name.text;
      else if (args[i]) value = expand(args[i], depth + 1);
      else {
        // Defaults are evaluated in declaration scope with earlier parameters.
        // Explicit arguments continue to use the caller's lexical bindings.
        const previous = bindings;
        bindings = next;
        value = expand(params[i].default!, depth + 1);
        bindings = previous;
      }
      if (!symbol || value === null) return null;
      if (params[i].constraint) {
        // Only independent scalar constraints are supported. Empty bindings
        // prevent a dependent constraint from borrowing a caller's parameter.
        const previous = bindings;
        bindings = new Map();
        const constraint = expand(params[i].constraint!, depth + 1);
        bindings = previous;
        if (
          constraint === null ||
          scalarContract(constraint) === null ||
          (!placeholders && !satisfiesScalarConstraint(value, constraint))
        )
          return null;
        if (params[i].default) {
          bindings = next;
          const fallback = expand(params[i].default!, depth + 1);
          bindings = previous;
          if (
            fallback === null ||
            !satisfiesScalarConstraint(fallback, constraint)
          )
            return null;
        }
      }
      next.set(symbol, value);
    }
    return next;
  }
  function expand(node: ts.TypeNode, depth: number): string | null {
    if (--remaining < 0 || depth > 8) return null;
    if (ts.isTypeReferenceNode(node)) {
      if (!ts.isIdentifier(node.typeName)) return null;
      let symbol = checker.getSymbolAtLocation(node.typeName);
      if (symbol && bindings.has(symbol))
        return node.typeArguments?.length ? null : bindings.get(symbol)!;
      if (["Array", "ReadonlyArray", "Promise"].includes(node.typeName.text)) {
        if (symbol?.declarations?.length || node.typeArguments?.length !== 1)
          return null;
        const element = expand(node.typeArguments[0], depth + 1);
        return element === null ? null : `${node.typeName.text}<${element}>`;
      }
      if (!symbol) return null;
      if (symbol.flags & ts.SymbolFlags.Alias)
        symbol = checker.getAliasedSymbol(symbol);
      if (active.has(symbol) || symbol.declarations?.length !== 1) return null;
      const declaration = symbol.declarations[0];
      if (!(
        ts.isTypeAliasDeclaration(declaration) ||
        ts.isInterfaceDeclaration(declaration)
      ))
        return null;
      const next = bind(
        declaration,
        node.typeArguments ?? [],
        depth,
        template && node === type,
      );
      if (next === null) return null;
      const previous = bindings;
      bindings = next;
      active.add(symbol);
      let result: string | null;
      if (ts.isTypeAliasDeclaration(declaration))
        result = expand(declaration.type, depth + 1);
      else {
        const members = interfaceMembers(declaration, depth + 1);
        result = members === null ? null : object(members, depth + 1);
      }
      active.delete(symbol);
      bindings = previous;
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
    if (ts.isTypeLiteralNode(node))
      return object(
        node.members.map((node) => ({ node, bindings })),
        depth + 1,
      );
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
  // merged declarations and qualified bases need a richer type harness.
  function interfaceMembers(
    declaration: ts.InterfaceDeclaration,
    depth: number,
  ): Member[] | null {
    if (--remaining < 0 || depth > 8) return null;
    const members: Member[] = [];
    for (const clause of declaration.heritageClauses ?? []) {
      if (clause.token !== ts.SyntaxKind.ExtendsKeyword) return null;
      for (const base of clause.types) {
        if (!ts.isIdentifier(base.expression)) return null;
        let symbol = checker.getSymbolAtLocation(base.expression);
        if (!symbol) return null;
        if (symbol.flags & ts.SymbolFlags.Alias)
          symbol = checker.getAliasedSymbol(symbol);
        if (active.has(symbol) || symbol.declarations?.length !== 1)
          return null;
        const inherited = symbol.declarations[0];
        if (!ts.isInterfaceDeclaration(inherited)) return null;
        const next = bind(inherited, base.typeArguments ?? [], depth);
        if (next === null) return null;
        const previous = bindings;
        bindings = next;
        active.add(symbol);
        const inheritedMembers = interfaceMembers(inherited, depth + 1);
        active.delete(symbol);
        bindings = previous;
        if (inheritedMembers === null) return null;
        members.push(...inheritedMembers);
        if (members.length > 3) return null;
      }
    }
    members.push(...declaration.members.map((node) => ({ node, bindings })));
    return members.length <= 3 ? members : null;
  }
  function object(members: readonly Member[], depth: number): string | null {
    if (members.length > 3) return null;
    const names = new Set<string>();
    const fields: string[] = [];
    for (const entry of members) {
      const member = entry.node;
      if (
        !ts.isPropertySignature(member) ||
        !member.type ||
        !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
      )
        return null;
      if (names.has(member.name.text) || member.name.text.length > 100)
        return null;
      names.add(member.name.text);
      const previous = bindings;
      bindings = entry.bindings;
      const value = expand(member.type, depth + 1);
      bindings = previous;
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
// Body-local aliases, generic functions and namespace-qualified names are not
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
      if (!["Array", "ReadonlyArray", "Promise"].includes(name)) {
        let symbol = checker.getSymbolAtLocation(node.typeName);
        if (symbol && symbol.flags & ts.SymbolFlags.Alias)
          symbol = checker.getAliasedSymbol(symbol);
        const declaration = symbol?.declarations?.[0];
        const params =
          declaration &&
          (ts.isInterfaceDeclaration(declaration) ||
            ts.isTypeAliasDeclaration(declaration))
            ? declaration.typeParameters
            : undefined;
        const body = params?.length
          ? expandPracticeType(node, checker, true)
          : expanded;
        if (body === null) {
          valid = false;
          return;
        }
        const parameterText = params?.map((parameter, index) => {
          const constraint = parameter.constraint
            ? expandPracticeType(parameter.constraint, checker)
            : undefined;
          if (constraint === null) valid = false;
          const head = `${parameter.name.text}${constraint ? ` extends ${constraint}` : ""}`;
          if (!parameter.default) return head;
          const fallback = expandPracticeType(
            parameter.default,
            checker,
            false,
            params.slice(0, index),
          );
          if (fallback === null) valid = false;
          return `${head} = ${fallback}`;
        });
        const definition = `type ${name}${parameterText?.length ? `<${parameterText.join(", ")}>` : ""} = ${body};`;
        if (aliases.has(name) && aliases.get(name) !== definition)
          valid = false;
        aliases.set(name, definition);
      }
    }
    ts.forEachChild(node, visit);
  }
  fn.parameters.forEach((p) => {
    if (p.type) visit(p.type);
  });
  if (fn.type) visit(fn.type);
  const context = [...aliases.values()].join("\n");
  return valid && aliases.size <= 16 && context.length <= 8192 ? context : null;
}
