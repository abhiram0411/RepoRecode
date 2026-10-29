import type { SymbolInfo } from "./types";

// Keep optional markers and default expressions as part of the input contract.
// Source parsing stays in the worker, never in the main UI bundle.
export function parameterText(s: SymbolInfo) {
  return s.parameters
    .map((p) => p.declaration ?? `${p.name}: ${p.type}`)
    .join(", ");
}
export function functionStub(s: SymbolInfo, comment: string) {
  return `${s.async ? "async " : ""}function ${s.name}${s.typeParameters ? `<${s.typeParameters}>` : ""}(${parameterText(s)}) {\n  // ${comment}\n\n}`;
}
