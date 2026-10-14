import ts from "typescript";
import { reactStateHook } from "./hookSites";
import type { StateRelation } from "./types";

// Resolve declaration identities, not matching names. These are direct syntax
// relationships only: no propagation through aliases, calls or dynamic keys.
export function stateRelations(
  sources: Map<string, ts.SourceFile>,
  checker: ts.TypeChecker,
) {
  const values = new Map<ts.Symbol, StateRelation["state"]>();
  const setters = new Map<ts.Symbol, StateRelation["state"]>();
  for (const [file, source] of sources) {
    function bind(node: ts.Node) {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isArrayBindingPattern(node.name) &&
        node.initializer &&
        ts.isCallExpression(node.initializer) &&
        ts.isVariableDeclarationList(node.parent) &&
        node.parent.flags & ts.NodeFlags.Const
      ) {
        const hook = reactStateHook(node.initializer, checker);
        const [value, setter] = node.name.elements;
        if (
          hook &&
          value &&
          ts.isBindingElement(value) &&
          ts.isIdentifier(value.name) &&
          !value.dotDotDotToken
        ) {
          const state = {
            file,
            line:
              source.getLineAndCharacterOfPosition(node.getStart(source)).line +
              1,
            name: value.name.text,
            hook,
          };
          const valueSymbol = checker.getSymbolAtLocation(value.name);
          if (valueSymbol) values.set(valueSymbol, state);
          if (
            setter &&
            ts.isBindingElement(setter) &&
            ts.isIdentifier(setter.name) &&
            !setter.dotDotDotToken
          ) {
            const setterSymbol = checker.getSymbolAtLocation(setter.name);
            if (setterSymbol) setters.set(setterSymbol, state);
          }
        }
      }
      ts.forEachChild(node, bind);
    }
    bind(source);
  }
  const result: StateRelation[] = [],
    seen = new Set<string>();
  let omitted = 0;
  for (const [file, source] of sources) {
    function add(
      state: StateRelation["state"],
      node: ts.Node,
      kind: StateRelation["kind"],
      label: string,
    ) {
      const site = {
        file,
        line:
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        label: label.slice(0, 160),
      };
      const key = JSON.stringify([
        state.file,
        state.line,
        state.name,
        site.file,
        site.line,
        kind,
        site.label,
      ]);
      if (seen.has(key)) return;
      seen.add(key);
      if (result.length >= 200) {
        omitted++;
        return;
      }
      result.push({ state, site, kind, evidence: "static" });
    }
    function reference(node: ts.Identifier) {
      if (ts.isShorthandPropertyAssignment(node.parent))
        return checker.getShorthandAssignmentValueSymbol(node.parent);
      return checker.getSymbolAtLocation(node);
    }
    function visit(node: ts.Node) {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        const symbol = reference(node.expression),
          state = symbol && setters.get(symbol);
        if (state)
          add(
            state,
            node,
            "update",
            `${node.expression.text}(${node.arguments.map((a) => a.getText(source)).join(", ")})`,
          );
      }
      if (ts.isIdentifier(node)) {
        const symbol = reference(node),
          state = symbol && (values.get(symbol) ?? setters.get(symbol));
        if (state && !symbol!.declarations?.some((d) => d === node.parent)) {
          const updater = setters.has(symbol!);
          let context: ts.Node = node;
          while (context.parent && !ts.isSourceFile(context.parent)) {
            const parent = context.parent;
            if (ts.isTypeNode(parent)) break;
            if (ts.isJsxAttribute(parent)) {
              const tag = parent.parent.parent;
              const label = `${parent.name.getText(source)} on ${ts.isJsxOpeningElement(tag) || ts.isJsxSelfClosingElement(tag) ? tag.tagName.getText(source) : "JSX"}`;
              add(state, parent, updater ? "handler" : "prop", label);
              break;
            }
            if (ts.isVariableDeclaration(parent) && parent.initializer) {
              if (!updater)
                add(
                  state,
                  parent,
                  "derive",
                  `${parent.name.getText(source)} initializer`,
                );
              break;
            }
            if (
              ts.isFunctionLike(parent) ||
              ts.isReturnStatement(parent) ||
              ts.isExpressionStatement(parent) ||
              ts.isJsxElement(parent)
            ) {
              if (!updater)
                add(state, node, "read", node.parent.getText(source));
              break;
            }
            context = parent;
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return { relations: result, omitted };
}
