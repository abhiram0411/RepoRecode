import ts from "typescript";
import type { ApiFlow } from "./types";

const methods = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
]);
// These are source-pattern matches, never evidence that a request reaches a server.
export function apiRelations(
  sources: Map<string, ts.SourceFile>,
  checker: ts.TypeChecker,
): ApiFlow {
  const requests: ApiFlow["requests"] = [],
    routes: ApiFlow["routes"] = [],
    links: ApiFlow["links"] = [];
  const receivers = new Set<ts.Symbol>();
  let omitted = 0;
  const literal = (node: ts.Node | undefined) =>
    node &&
    (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      ? node.text
      : undefined;
  const path = (node: ts.Node | undefined) => {
    const value = literal(node);
    return value &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      value.length <= 300
      ? value
      : undefined;
  };
  function imported(node: ts.Identifier, name: string) {
    const decl = checker.getSymbolAtLocation(node)?.declarations?.[0];
    if (!decl) return false;
    if (ts.isImportClause(decl))
      return (
        name === "default" &&
        !!decl.name &&
        literal(decl.parent.moduleSpecifier) === "express" &&
        !decl.isTypeOnly
      );
    if (ts.isImportSpecifier(decl))
      return (
        (decl.propertyName ?? decl.name).text === name &&
        literal(decl.parent.parent.parent.moduleSpecifier) === "express" &&
        !decl.isTypeOnly &&
        !decl.parent.parent.isTypeOnly
      );
    return false;
  }
  function factory(node: ts.Expression) {
    return ts.isIdentifier(node)
      ? imported(node, "default") || imported(node, "Router")
      : ts.isPropertyAccessExpression(node) &&
          node.name.text === "Router" &&
          ts.isIdentifier(node.expression) &&
          imported(node.expression, "default");
  }
  for (const source of sources.values()) {
    const visit = (node: ts.Node) => {
      if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.initializer &&
        ts.isCallExpression(node.initializer) &&
        factory(node.initializer.expression) &&
        ts.isVariableDeclarationList(node.parent) &&
        node.parent.flags & ts.NodeFlags.Const
      ) {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol) receivers.add(symbol);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  for (const [file, source] of sources) {
    const add = (
      kind: "request" | "route",
      node: ts.Node,
      method: string,
      url: string,
    ) => {
      if (requests.length + routes.length >= 200) {
        omitted++;
        return;
      }
      const entry = {
        file,
        line:
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        method,
        path: url,
      };
      if (kind === "request") requests.push(entry);
      else routes.push(entry);
    };
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression,
          url = path(node.arguments[0]);
        if (
          url &&
          ts.isIdentifier(callee) &&
          callee.text === "fetch" &&
          !checker.getSymbolAtLocation(callee)?.declarations?.length &&
          node.arguments.length <= 2
        ) {
          let method: string | undefined = "GET";
          const options = node.arguments[1];
          if (options) {
            if (!ts.isObjectLiteralExpression(options)) method = undefined;
            else {
              let count = 0;
              for (const property of options.properties) {
                if (
                  ts.isSpreadAssignment(property) ||
                  ts.isComputedPropertyName(property.name)
                ) {
                  method = undefined;
                  break;
                }
                const key = ts.isIdentifier(property.name)
                  ? property.name.text
                  : literal(property.name);
                if (key === "__proto__") {
                  method = undefined;
                  break;
                }
                if (key === "method") {
                  if (++count > 1 || !ts.isPropertyAssignment(property)) {
                    method = undefined;
                    break;
                  }
                  method = literal(property.initializer)?.toUpperCase();
                }
              }
            }
          }
          if (method && methods.has(method)) add("request", node, method, url);
        }
        if (
          url &&
          ts.isPropertyAccessExpression(callee) &&
          ts.isIdentifier(callee.expression) &&
          node.arguments.length >= 2
        ) {
          let symbol = checker.getSymbolAtLocation(callee.expression);
          if (symbol && symbol.flags & ts.SymbolFlags.Alias)
            symbol = checker.getAliasedSymbol(symbol);
          const method = callee.name.text.toUpperCase();
          if (
            symbol &&
            receivers.has(symbol) &&
            methods.has(method) &&
            callee.name.text === method.toLowerCase()
          )
            add("route", node, method, url);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  requests.forEach((request, i) =>
    routes.forEach((route, j) => {
      if (request.method === route.method && request.path === route.path) {
        if (links.length >= 200) {
          omitted++;
          return;
        }
        links.push({ request: i, route: j, evidence: "candidate" });
      }
    }),
  );
  return { requests, routes, links, omitted };
}
