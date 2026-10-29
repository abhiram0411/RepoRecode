import ts from "typescript";

// Compare scalar contracts, not sampled values: a few numeric probes cannot
// establish that `number` satisfies a literal-only constraint such as 1 | 2.
function scalarContract(
  text: string,
  placeholders: ReadonlySet<string> = new Set(),
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
    if (
      ts.isTypeReferenceNode(node) &&
      ts.isIdentifier(node.typeName) &&
      !node.typeArguments?.length &&
      placeholders.has(node.typeName.text)
    )
      return [{ kind: `parameter:${node.typeName.text}` }];
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

type ConstraintContract =
  | { kind: "scalar"; atoms: NonNullable<ReturnType<typeof scalarContract>> }
  | {
      kind: "object";
      fields: Map<string, { optional: boolean; type: ConstraintContract }>;
    };

// Structural bounds use the same small-data boundary as generated inputs.
// Extra actual fields are permitted, but never repair a missing required field.
function constraintContract(
  text: string,
  placeholders: ReadonlySet<string> = new Set(),
): ConstraintContract | null {
  const file = ts.createSourceFile(
    "constraint.ts",
    `type C = ${text};`,
    ts.ScriptTarget.Latest,
    true,
  );
  const declaration = file.statements[0];
  if (!declaration || !ts.isTypeAliasDeclaration(declaration)) return null;
  let leaves = 0;
  function visit(node: ts.TypeNode, depth: number): ConstraintContract | null {
    if (ts.isParenthesizedTypeNode(node)) return visit(node.type, depth);
    const atoms = scalarContract(node.getText(), placeholders);
    if (atoms) return ++leaves <= 3 ? { kind: "scalar", atoms } : null;
    if (!ts.isTypeLiteralNode(node) || depth >= 2 || node.members.length > 3)
      return null;
    const fields = new Map<
      string,
      { optional: boolean; type: ConstraintContract }
    >();
    for (const member of node.members) {
      if (
        !ts.isPropertySignature(member) ||
        !member.type ||
        !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) ||
        fields.has(member.name.text)
      )
        return null;
      const type = visit(member.type, depth + 1);
      if (!type) return null;
      fields.set(member.name.text, { optional: !!member.questionToken, type });
    }
    return { kind: "object", fields };
  }
  return visit(declaration.type, 0);
}

function satisfiesConstraint(
  value: string,
  constraint: string,
  placeholders: ReadonlySet<string> = new Set(),
): boolean {
  const actual = constraintContract(value, placeholders),
    allowed = constraintContract(constraint, placeholders);
  function accepts(
    actual: ConstraintContract,
    allowed: ConstraintContract,
  ): boolean {
    if (actual.kind === "object" && allowed.kind === "object") {
      // TypeScript's weak-type check rejects nonempty objects that share no
      // property with an entirely optional target (an empty object is valid).
      if (
        allowed.fields.size &&
        actual.fields.size &&
        [...allowed.fields.values()].every((field) => field.optional) &&
        ![...allowed.fields.keys()].some((name) => actual.fields.has(name))
      )
        return false;
      return [...allowed.fields].every(([name, bound]) => {
        const field = actual.fields.get(name);
        // The isolated compiler uses strict mode without exactOptionalPropertyTypes:
        // optional scalar properties also admit an explicit undefined value.
        const type: ConstraintContract =
          bound.optional && bound.type.kind === "scalar"
            ? {
                kind: "scalar",
                atoms: [...bound.type.atoms, { kind: "undefined" }],
              }
            : bound.type;
        return field
          ? (!field.optional || bound.optional) && accepts(field.type, type)
          : bound.optional;
      });
    }
    if (actual.kind !== "scalar" || allowed.kind !== "scalar") return false;
    return actual.atoms.every((atom) =>
      allowed.atoms.some(
        (bound) =>
          atom.kind === bound.kind &&
          (bound.literal === undefined || atom.literal === bound.literal),
      ),
    );
  }
  return !!actual && !!allowed && accepts(actual, allowed);
}

// Resolve only finite data syntax from the imported source, never runtime values.
// Expansion is bounded independently of the exercise's input/sample limits.
export function expandPracticeType(
  type: ts.TypeNode,
  checker: ts.TypeChecker,
  template = false,
  parameters: readonly ts.TypeParameterDeclaration[] = [],
  concreteBindings: ReadonlyMap<ts.Symbol, string> = new Map(),
): string | null {
  let remaining = 256;
  const active = new Set<ts.Symbol>();
  let bindings = new Map(concreteBindings);
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
    // Constraints see only earlier parameters in this declaration. In a
    // read-only template, retain their symbolic identities rather than using
    // a concrete call's arguments to justify an invalid generic default.
    const earlier = new Map<ts.Symbol, string>();
    const symbolic = new Set<string>();
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
        const previous = bindings;
        bindings = earlier;
        const constraint = expand(params[i].constraint!, depth + 1);
        bindings = previous;
        if (
          constraint === null ||
          constraintContract(constraint, symbolic) === null ||
          (!placeholders && !satisfiesConstraint(value, constraint))
        )
          return null;
        if (params[i].default) {
          bindings = next;
          const fallback = expand(params[i].default!, depth + 1);
          bindings = previous;
          if (
            fallback === null ||
            !satisfiesConstraint(fallback, constraint, symbolic)
          )
            return null;
        }
      }
      next.set(symbol, value);
      earlier.set(symbol, value);
      if (placeholders) symbolic.add(params[i].name.text);
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

// Generic functions are exercised at explicit scalar/small-object upper bounds.
// Earlier parameters may constrain later ones. Self/forward bounds are rejected.
// The original generic declaration is still type-checked before evaluation.
export function functionPracticeBindings(
  fn: ts.FunctionLikeDeclaration,
  checker: ts.TypeChecker,
): Map<ts.Symbol, string> | null {
  const params = fn.typeParameters ?? [];
  if (params.length > 3) return null;
  const bindings = new Map<ts.Symbol, string>();
  for (const [index, param] of params.entries()) {
    if (
      !param.constraint ||
      param.modifiers?.length ||
      (!param.default && params.slice(0, index).some((p) => p.default))
    )
      return null;
    const symbol = checker.getSymbolAtLocation(param.name);
    const bound = expandPracticeType(
      param.constraint,
      checker,
      false,
      [],
      bindings,
    );
    if (!symbol || bound === null || !constraintContract(bound)) return null;
    if (param.default) {
      const fallback = expandPracticeType(
        param.default,
        checker,
        false,
        [],
        bindings,
      );
      // A concrete upper bound must not justify an invalid generic default:
      // U extends T = number is invalid even when T extends number. Keep earlier
      // parameter identities when checking the template, just as for aliases.
      const earlier = params.slice(0, index);
      const placeholders = new Set(earlier.map((p) => p.name.text));
      const templateBound = expandPracticeType(
        param.constraint,
        checker,
        false,
        earlier,
      );
      const templateDefault = expandPracticeType(
        param.default,
        checker,
        false,
        earlier,
      );
      if (
        fallback === null ||
        !satisfiesConstraint(fallback, bound) ||
        templateBound === null ||
        templateDefault === null ||
        !satisfiesConstraint(templateDefault, templateBound, placeholders)
      )
        return null;
    }
    bindings.set(symbol, bound);
  }
  return bindings;
}

// Retain source names in the exercise, with a read-only type context.
// Body-local aliases and namespace-qualified names require a richer harness.
export function practiceTypeContext(
  fn: ts.FunctionLikeDeclaration,
  checker: ts.TypeChecker,
): string | null {
  const resolvedBindings = functionPracticeBindings(fn, checker);
  if (resolvedBindings === null) return null;
  const bindings = resolvedBindings;
  const aliases = new Map<string, string>();
  let valid = true;
  function visit(node: ts.Node) {
    if (ts.isTypeReferenceNode(node)) {
      const expanded = expandPracticeType(node, checker, false, [], bindings);
      if (expanded === null || !ts.isIdentifier(node.typeName)) {
        valid = false;
        return;
      }
      const name = node.typeName.text;
      const referenced = checker.getSymbolAtLocation(node.typeName);
      if (referenced && bindings.has(referenced)) return;
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
          ? expandPracticeType(node, checker, true, [], bindings)
          : expanded;
        if (body === null) {
          valid = false;
          return;
        }
        const parameterText = params?.map((parameter, index) => {
          const constraint = parameter.constraint
            ? expandPracticeType(
                parameter.constraint,
                checker,
                false,
                params.slice(0, index),
              )
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
  fn.typeParameters?.forEach((p) => {
    if (p.constraint) visit(p.constraint);
    if (p.default) visit(p.default);
  });
  if (fn.type) visit(fn.type);
  const context = [...aliases.values()].join("\n");
  return valid && aliases.size <= 16 && context.length <= 8192 ? context : null;
}
