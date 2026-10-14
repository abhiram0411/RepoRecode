import ts from "typescript";
import type { SymbolInfo } from "./types";

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
    // Imported/local aliases named Array are not the built-in input contract.
    if (checker?.getSymbolAtLocation(type.typeName)?.declarations?.length)
      return null;
    element = type.typeArguments[0];
  }
  if (element) {
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

function objectValues(type: ts.TypeLiteralNode): unknown[] | null {
  // Deliberately shallow: no named types, methods, index signatures or nesting.
  if (type.members.length > 3) return null;
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
    let values = scalar(member.type);
    if (!values) return null;
    // Primitive number/string domains are sampled; literal unions retain every
    // declared choice or are rejected if too wide for per-field coverage.
    let leaf = member.type;
    while (ts.isParenthesizedTypeNode(leaf)) leaf = leaf.type;
    if (values.length > 4) {
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
  // combinations serializes its input for deduplication, so use finite indexes
  // rather than the private omission marker. At most 6 choices x 3 fields:
  // 1 + 3 * (6 - 1) fits 16 and varies every field before mixed combinations.
  return combinations(
    fields.map((f) => f.values.map((_, i) => i)),
    16,
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

function signature(code: string) {
  const sf = ts.createSourceFile(
    "input.ts",
    normalizeFunction(code),
    ts.ScriptTarget.Latest,
    true,
  );
  const first = sf.statements[0];
  if (first && ts.isFunctionDeclaration(first)) return first.parameters;
  if (first && ts.isVariableStatement(first)) {
    const fn = first.declarationList.declarations[0]?.initializer;
    if (fn && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)))
      return fn.parameters;
  }
  return undefined;
}

export function probes(s: SymbolInfo): unknown[][] {
  // Read source so saved pre-upgrade indexes also get optional/default probes.
  const parameters = signature(s.code);
  if (!parameters || parameters.length > 3) return [];
  const domains = parameters.map((p) => {
    if (!p.type || p.dotDotDotToken || !ts.isIdentifier(p.name)) return null;
    const values = parameterValues(p.type);
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
