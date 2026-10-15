import ts from "typescript";
import type { SymbolInfo } from "./types";
import { expandPracticeType } from "./practiceTypes";

const vectors: Record<string, unknown[]> = {
  number: [0, 1, -1, 2, 10, 0.5, -3, 100],
  string: ["", "a", "hello", "two words", "  trim  ", "é", "0", "ABCDE"],
  boolean: [false, true],
  "number[]": [[], [0], [1, 2, 3], [-2, 0, 2], [10, -10, 0]],
  "string[]": [[], ["a"], ["a", "b"], ["", "a"], ["same", "same"]],
  "boolean[]": [
    [],
    [false],
    [true],
    [false, true],
    [true, false],
    [true, true],
  ],
};

// JavaScript input notation retains undefined and -0, unlike JSON arrays.
// Only the bounded data values generated below can be serialized here.
export function inputExpression(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (Array.isArray(value)) return `[${value.map(inputExpression).join(",")}]`;
  if (typeof value === "number" && Number.isFinite(value))
    return Object.is(value, -0) ? "-0" : String(value);
  if (typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (
    typeof value === "object" &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  ) {
    const fields = Object.entries(Object.getOwnPropertyDescriptors(value));
    if (
      fields.length > 3 ||
      fields.some(([, d]) => !("value" in d) || !d.enumerable)
    )
      throw Error("Unsupported practice input.");
    // Computed keys preserve an own __proto__ property without setting a prototype.
    return `({${fields.map(([key, d]) => `[${JSON.stringify(key)}]:${inputExpression(d.value)}`).join(",")}})`;
  }
  throw Error("Unsupported practice input.");
}

function unique(values: unknown[]): unknown[] {
  return [...new Map(values.map((v) => [inputExpression(v), v])).values()];
}

export function combinations(domains: unknown[][], limit = 64): unknown[][] {
  if (!domains.length) return [[]];
  if (domains.some((d) => !d.length)) return [];
  const result: unknown[][] = [],
    seen = new Set<string>();
  function add(args: unknown[]) {
    const key = inputExpression(args);
    if (result.length < limit && !seen.has(key)) {
      seen.add(key);
      result.push(args);
    }
  }
  const baseline = domains.map((d) => d[0]);
  add(baseline);
  domains.forEach((domain, index) =>
    domain.forEach((value) => {
      const args = [...baseline];
      args[index] = value;
      add(args);
    }),
  );
  for (let i = 0; i < Math.max(...domains.map((d) => d.length)); i++)
    add(domains.map((d) => d[i % d.length]));
  const total = domains.reduce((n, d) => n * d.length, 1);
  function at(index: number) {
    const args: unknown[] = [];
    for (let i = domains.length - 1; i >= 0; i--) {
      args[i] = domains[i][index % domains[i].length];
      index = Math.floor(index / domains[i].length);
    }
    return args;
  }
  for (let i = 0; i < limit; i++)
    add(at(Math.floor((i * (total - 1)) / (limit - 1))));
  for (let i = 0; i < total && result.length < limit; i++) add(at(i));
  return result;
}

function scalar(node: ts.TypeNode, depth = 0): unknown[] | null {
  if (depth > 4) return null;
  if (ts.isParenthesizedTypeNode(node)) return scalar(node.type, depth + 1);
  if (ts.isUnionTypeNode(node)) {
    const domains = node.types.map((t) => scalar(t, depth + 1));
    if (domains.some((d) => d === null)) return null;
    const result = unique(domains.flatMap((d) => d!));
    return result.length <= 16 ? result : null;
  }
  if (node.kind === ts.SyntaxKind.NumberKeyword) return vectors.number;
  if (node.kind === ts.SyntaxKind.StringKeyword) return vectors.string;
  if (node.kind === ts.SyntaxKind.BooleanKeyword) return vectors.boolean;
  if (node.kind === ts.SyntaxKind.UndefinedKeyword) return [undefined];
  if (!ts.isLiteralTypeNode(node)) return null;
  const literal = node.literal;
  if (ts.isStringLiteral(literal))
    return literal.text.length <= 200 ? [literal.text] : null;
  if (literal.kind === ts.SyntaxKind.TrueKeyword) return [true];
  if (literal.kind === ts.SyntaxKind.FalseKeyword) return [false];
  if (literal.kind === ts.SyntaxKind.NullKeyword) return [null];
  const value = ts.isNumericLiteral(literal)
    ? Number(literal.text)
    : ts.isPrefixUnaryExpression(literal) &&
        literal.operator === ts.SyntaxKind.MinusToken &&
        ts.isNumericLiteral(literal.operand)
      ? -Number(literal.operand.text)
      : NaN;
  return Number.isFinite(value) ? [value] : null;
}

export function parameterValues(
  type: ts.TypeNode,
  checker?: ts.TypeChecker,
): unknown[] | null {
  if (checker) {
    const expanded = expandPracticeType(type, checker);
    if (expanded === null) return null;
    const parsed = ts.createSourceFile(
      "contract.ts",
      `type Contract = ${expanded};`,
      ts.ScriptTarget.Latest,
      true,
    );
    const declaration = parsed.statements[0];
    return ts.isTypeAliasDeclaration(declaration)
      ? parameterValues(declaration.type)
      : null;
  }
  const simple = scalar(type);
  if (simple) return simple;
  if (ts.isTypeLiteralNode(type)) return objectValues(type);
  if (ts.isParenthesizedTypeNode(type))
    return parameterValues(type.type, checker);
  if (
    ts.isTypeOperatorNode(type) &&
    type.operator === ts.SyntaxKind.ReadonlyKeyword
  )
    return parameterValues(type.type, checker);
  let element: ts.TypeNode | undefined;
  if (ts.isArrayTypeNode(type)) element = type.elementType;
  else if (
    ts.isTypeReferenceNode(type) &&
    ts.isIdentifier(type.typeName) &&
    ["Array", "ReadonlyArray"].includes(type.typeName.text) &&
    type.typeArguments?.length === 1
  ) {
    // When source declarations are available, expansion above has already
    // rejected imported/local aliases named Array or ReadonlyArray.
    element = type.typeArguments[0];
  }
  if (element) {
    while (ts.isParenthesizedTypeNode(element)) element = element.type;
    const domain = scalar(element);
    if (!domain) return null;
    const preset = vectors[`${element.getText()}[]`];
    if (preset) return preset;
    // Keep each declared literal reachable as a single-element sample.
    if (domain.length > 12) return null;
    return unique([
      [],
      ...domain.map((v) => [v]),
      [domain[0], domain.at(-1)],
      [domain.at(-1), domain[0]],
    ]);
  }
  if (ts.isTupleTypeNode(type) && type.elements.length <= 3) {
    const domains = type.elements.map((t) => {
      if (ts.isNamedTupleMember(t)) {
        if (t.dotDotDotToken || t.questionToken) return null;
        return scalar(t.type);
      }
      return scalar(t);
    });
    if (domains.some((d) => d === null)) return null;
    // A tuple is sampled as one parameter. Vary all positions within its cap.
    const sampled = domains.map((d) =>
      d!.length <= 4
        ? d!
        : Array.from(
            { length: 4 },
            (_, i) => d![Math.floor((i * (d!.length - 1)) / 3)],
          ),
    );
    return combinations(sampled, 16);
  }
  return null;
}

function objectValues(
  type: ts.TypeLiteralNode,
  depth = 0,
  budget = { leaves: 0 },
): unknown[] | null {
  // Two object levels and three scalar leaves across the entire parameter.
  // Nested domains contain independent field variations, preserving room for
  // each sibling's variation inside the existing sixteen-object sample cap.
  if (depth > 1 || type.members.length > 3) return null;
  const missing = Symbol("missing property");
  const fields: { name: string; values: unknown[] }[] = [];
  for (const member of type.members) {
    if (
      !ts.isPropertySignature(member) ||
      !member.type ||
      !(ts.isIdentifier(member.name) || ts.isStringLiteral(member.name))
    )
      return null;
    const name = member.name.text;
    if (name.length > 100 || fields.some((f) => f.name === name)) return null;
    // Primitive number/string domains are sampled; literal unions retain every
    // declared choice or are rejected if too wide for per-field coverage.
    let leaf = member.type;
    while (ts.isParenthesizedTypeNode(leaf)) leaf = leaf.type;
    const nested = ts.isTypeLiteralNode(leaf);
    let values = ts.isTypeLiteralNode(leaf)
      ? objectValues(leaf, depth + 1, budget)
      : scalar(leaf);
    if (!values || (!nested && ++budget.leaves > 3)) return null;
    if (!nested && values.length > 4) {
      if (
        ![ts.SyntaxKind.NumberKeyword, ts.SyntaxKind.StringKeyword].includes(
          leaf.kind,
        )
      )
        return null;
      values = Array.from(
        { length: 4 },
        (_, i) => values![Math.floor((i * (values!.length - 1)) / 3)],
      );
    }
    fields.push({
      name,
      values: member.questionToken
        ? [missing, ...unique([undefined, ...values])]
        : values,
    });
  }
  // Never silently drop independent leaf/container variations to fit the cap.
  const required =
    1 + fields.reduce((n, field) => n + field.values.length - 1, 0);
  if (required > 16) return null;
  // Serialize finite indexes instead of the private omission marker. Inner
  // objects use only the independent variations; the root may add mixed cases.
  return combinations(
    fields.map((f) => f.values.map((_, i) => i)),
    depth ? required : 16,
  ).map((row) =>
    Object.fromEntries(
      fields.flatMap((f, i) => {
        const value = f.values[row[i] as number];
        return value === missing ? [] : [[f.name, value]];
      }),
    ),
  );
}

export function normalizeFunction(code: string) {
  return /^\s*(export\s+)?(default\s+)?(async\s+)?function\b/.test(code) ||
    /^\s*(export\s+)?(const|let|var)\b/.test(code)
    ? code
    : `const ${code};`;
}

function signature(code: string, context = "") {
  let sf = ts.createSourceFile(
    "input.ts",
    `${context}\n${normalizeFunction(code)}`,
    ts.ScriptTarget.Latest,
    true,
  );
  let checker: ts.TypeChecker | undefined;
  if (context) {
    const host: ts.CompilerHost = {
      getSourceFile: (name) => (name === "input.ts" ? sf : undefined),
      getDefaultLibFileName: () => "",
      writeFile: () => {},
      getCurrentDirectory: () => "",
      getDirectories: () => [],
      fileExists: (name) => name === "input.ts",
      readFile: (name) => (name === "input.ts" ? sf.text : undefined),
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
    };
    const program = ts.createProgram(["input.ts"], { noLib: true }, host);
    checker = program.getTypeChecker();
    sf = program.getSourceFile("input.ts")!;
  }
  const first = sf.statements.find((s) => !ts.isTypeAliasDeclaration(s));
  if (first && ts.isFunctionDeclaration(first))
    return { parameters: first.parameters, checker };
  if (first && ts.isVariableStatement(first)) {
    const fn = first.declarationList.declarations[0]?.initializer;
    if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)))
      return { parameters: fn.parameters, checker };
  }
  return undefined;
}

export function probes(s: SymbolInfo): unknown[][] {
  // Read source so saved pre-upgrade indexes also get optional/default probes.
  const { parameters, checker } = signature(s.code, s.practiceTypes) ?? {};
  if (!parameters || parameters.length > 3) return [];
  const domains = parameters.map((p) => {
    if (!p.type || p.dotDotDotToken || !ts.isIdentifier(p.name)) return null;
    const values = parameterValues(p.type, checker);
    return (
      values &&
      (p.questionToken || p.initializer
        ? unique([undefined, ...values])
        : values)
    );
  });
  if (domains.some((d) => d === null)) return [];
  const missing: unknown[][] = [];
  for (let count = parameters.length - 1; count >= 0; count--) {
    if (!parameters.slice(count).every((p) => p.questionToken || p.initializer))
      break;
    missing.push(domains.slice(0, count).map((d) => d![0]));
  }
  return [
    ...missing,
    ...combinations(domains as unknown[][], 64 - missing.length),
  ];
}
