function answerKey(
  value: unknown,
  depth = 0,
  budget = { left: 250 },
): unknown[] {
  if (--budget.left < 0 || depth > 10)
    throw Error("Answer is too large or deeply nested.");
  if (value === null) return ["null"];
  if (value === undefined) return ["undefined"];
  if (typeof value === "number") return ["number", String(value)];
  if (typeof value === "string" || typeof value === "boolean")
    return [typeof value, value];
  if (Array.isArray(value))
    return ["array", value.map((v) => answerKey(v, depth + 1, budget))];
  if (typeof value === "object")
    return [
      "object",
      Object.keys(value)
        .sort()
        .map((k) => [
          k,
          answerKey((value as Record<string, unknown>)[k], depth + 1, budget),
        ]),
    ];
  throw Error("Unsupported answer.");
}

// JSON cannot represent undefined, holes or nonfinite numbers inside a compound
// value. Do not offer a challenge whose correct answer cannot be entered.
export function predictionSupported(encoded?: string): boolean {
  if (!encoded || encoded.length > 16000) return false;
  let budget = 250;
  function check(key: unknown, top: boolean, depth: number): boolean {
    if (--budget < 0 || depth > 10 || !Array.isArray(key)) return false;
    switch (key[0]) {
      case "null":
        return key.length === 1;
      case "undefined":
        return top && key.length === 1;
      case "string":
        return key.length === 2 && typeof key[1] === "string";
      case "boolean":
        return key.length === 2 && typeof key[1] === "boolean";
      case "number":
        return (
          key.length === 2 &&
          typeof key[1] === "string" &&
          ((Number.isFinite(Number(key[1])) &&
            String(Number(key[1])) === key[1]) ||
            (top && ["NaN", "Infinity", "-Infinity"].includes(key[1])))
        );
      case "array":
        return (
          key.length === 2 &&
          Array.isArray(key[1]) &&
          key[1].every((v) => check(v, false, depth + 1))
        );
      case "object":
        return (
          key.length === 2 &&
          Array.isArray(key[1]) &&
          key[1].every(
            (entry) =>
              Array.isArray(entry) &&
              entry.length === 2 &&
              typeof entry[0] === "string" &&
              check(entry[1], false, depth + 1),
          )
        );
      default:
        return false;
    }
  }
  try {
    return check(JSON.parse(encoded), true, 0);
  } catch {
    return false;
  }
}

export function predictionMatches(answer: string, encoded?: string): boolean {
  if (!predictionSupported(encoded))
    throw Error("This output cannot be entered in the prediction field.");
  if (answer.length > 16000) throw Error("Answer exceeds 16,000 characters.");
  const text = answer.trim();
  const special: Record<string, unknown> = {
    undefined,
    NaN,
    Infinity,
    "-Infinity": -Infinity,
  };
  let value: unknown;
  if (Object.hasOwn(special, text)) value = special[text];
  else {
    try {
      value = JSON.parse(text);
    } catch {
      throw Error(
        "Enter JSON, or one of: undefined, NaN, Infinity, -Infinity.",
      );
    }
  }
  return JSON.stringify(answerKey(value)) === encoded;
}
