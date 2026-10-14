import ts from "typescript";
import { getQuickJS } from "quickjs-emscripten";
import { parseFragment } from "parse5";
import runtime from "../generated/react-runtime.js?raw";
import type { SourceFile } from "./types";
import { validateFiles } from "./import";
import { patchSource, type SourcePatch } from "./sourcePatch";
import { hookSites } from "./hookSites";
import { collectPreviewStyles, sanitizeInlineStyle } from "./previewStyles";
const tags = new Set(
  "div span p main section article header footer nav aside h1 h2 h3 h4 h5 h6 ul ol li strong em b i small pre code blockquote button input label select option textarea progress meter table thead tbody tr th td form img br hr a details summary figure figcaption".split(
    " ",
  ),
);
const voidTags = new Set(["input", "img", "br", "hr"]);
const attrs = new Set([
  "class",
  "id",
  "title",
  "role",
  "type",
  "value",
  "placeholder",
  "disabled",
  "checked",
  "selected",
  "min",
  "max",
  "step",
  "colspan",
  "rowspan",
  "aria-label",
  "aria-hidden",
  "aria-expanded",
  "data-rr-file",
  "data-rr-line",
  "data-rr-node",
  "data-rr-events",
]);
function escape(value: string) {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function sanitizePreview(html: string) {
  if (html.length > 512000) throw Error("Rendered output exceeds 500 KiB.");
  const root = parseFragment(html);
  let nodes = 0;
  function render(node: any): string {
    if (++nodes > 5000) throw Error("Preview contains too many elements.");
    if (node.nodeName === "#text") return escape(node.value);
    if (!node.tagName) return (node.childNodes ?? []).map(render).join("");
    if (!tags.has(node.tagName)) return "";
    const properties = [];
    for (const a of node.attrs ?? []) {
      if (attrs.has(a.name)) properties.push(`${a.name}="${escape(a.value)}"`);
      else if (a.name === "style") {
        const safe = sanitizeInlineStyle(a.value);
        if (safe) properties.push(`style="${escape(safe)}"`);
      }
    }
    return `<${node.tagName}${properties.length ? " " + properties.join(" ") : ""}>${voidTags.has(node.tagName) ? "" : (node.childNodes ?? []).map(render).join("") + `</${node.tagName}>`}`;
  }
  return render(root);
}
export function instrument(
  file: SourceFile,
  originalLine: (file: string, line: number) => number,
  observeCalls = false,
) {
  const hooks = observeCalls ? hookSites(file) : new Map();
  const sf = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of sf.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text.endsWith(".css") &&
      statement.importClause
    )
      return "throw Error('CSS modules and bound CSS imports are unsupported. Use a local side-effect CSS import.');";
  }
  const transformer: ts.TransformerFactory<ts.SourceFile> =
    (context) => (root) => {
      function record(fn: ts.Node & { name?: ts.Node }) {
        const parent = fn.parent;
        const name =
          fn.name?.getText(sf) ??
          (ts.isVariableDeclaration(parent) ||
          ts.isPropertyAssignment(parent) ||
          ts.isJsxAttribute(parent)
            ? parent.name.getText(sf)
            : ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)
              ? parent.parent.name.getText(sf)
              : "anonymous");
        return ts.factory.createExpressionStatement(
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier("globalThis"),
              "__rrRecordCall",
            ),
            undefined,
            [
              ts.factory.createStringLiteral(file.path),
              ts.factory.createNumericLiteral(
                originalLine(
                  file.path,
                  sf.getLineAndCharacterOfPosition(fn.getStart(sf)).line + 1,
                ),
              ),
              ts.factory.createStringLiteral(name.slice(0, 160)),
            ],
          ),
        );
      }
      const visit: ts.Visitor = (node) => {
        if (observeCalls && ts.isCallExpression(node)) {
          const site = hooks.get(node.getStart(sf));
          if (site) {
            const visited = ts.visitEachChild(node, visit, context);
            return ts.factory.createCallExpression(
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier("globalThis"),
                "__rrRecordState",
              ),
              undefined,
              [
                ts.factory.createStringLiteral(file.path),
                ts.factory.createNumericLiteral(
                  originalLine(
                    file.path,
                    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line +
                      1,
                  ),
                ),
                ts.factory.createStringLiteral(site.hook),
                ts.factory.createStringLiteral(site.label),
                visited,
              ],
            );
          }
        }
        if (
          observeCalls &&
          ts.isArrowFunction(node) &&
          !ts.isBlock(node.body)
        ) {
          const visited = ts.visitEachChild(node, visit, context);
          return ts.factory.updateArrowFunction(
            visited,
            visited.modifiers,
            visited.typeParameters,
            visited.parameters,
            visited.type,
            visited.equalsGreaterThanToken,
            ts.factory.createBlock(
              [
                record(node),
                ts.factory.createReturnStatement(visited.body as ts.Expression),
              ],
              true,
            ),
          );
        }
        if (
          observeCalls &&
          ts.isBlock(node) &&
          ts.isFunctionLike(node.parent) &&
          "body" in node.parent &&
          node.parent.body === node
        ) {
          const visited = ts.visitEachChild(node, visit, context);
          const statements = [...visited.statements];
          let directives = 0;
          while (
            directives < statements.length &&
            ts.isExpressionStatement(statements[directives]) &&
            ts.isStringLiteral(
              (statements[directives] as ts.ExpressionStatement).expression,
            )
          )
            directives++;
          statements.splice(directives, 0, record(node.parent));
          return ts.factory.updateBlock(visited, statements);
        }
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const name = node.tagName.getText(sf);
          if (/^[a-z]/.test(name)) {
            const attributes = ts.factory.createJsxAttributes([
              ...node.attributes.properties.filter(
                (a) =>
                  !ts.isJsxAttribute(a) ||
                  !a.name.getText(sf).startsWith("data-rr-"),
              ),
              ts.factory.createJsxAttribute(
                ts.factory.createIdentifier("data-rr-file"),
                ts.factory.createStringLiteral(file.path),
              ),
              ts.factory.createJsxAttribute(
                ts.factory.createIdentifier("data-rr-line"),
                ts.factory.createStringLiteral(
                  String(
                    originalLine(
                      file.path,
                      sf.getLineAndCharacterOfPosition(node.getStart(sf)).line +
                        1,
                    ),
                  ),
                ),
              ),
            ]);
            node = ts.isJsxOpeningElement(node)
              ? ts.factory.updateJsxOpeningElement(
                  node,
                  node.tagName,
                  node.typeArguments,
                  attributes,
                )
              : ts.factory.updateJsxSelfClosingElement(
                  node,
                  node.tagName,
                  node.typeArguments,
                  attributes,
                );
          }
        }
        return ts.visitEachChild(node, visit, context);
      };
      return ts.visitNode(root, visit) as ts.SourceFile;
    };
  const result = ts.transpileModule(file.content, {
    fileName: file.path,
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.React,
      jsxFactory: "__rrReact.createElement",
      jsxFragmentFactory: "__rrReact.Fragment",
      esModuleInterop: true,
    },
    transformers: { before: [transformer] },
    reportDiagnostics: true,
  });
  const errors = result.diagnostics?.filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  );
  if (errors?.length)
    throw Error(
      errors
        .map((d) => ts.flattenDiagnosticMessageText(d.messageText, " "))
        .join("\n"),
    );
  return result.outputText;
}
export function previewBootstrap(
  files: SourceFile[],
  entry: string,
  exportName: string,
  props: unknown = {},
  patch?: SourcePatch,
  renderFunction: "__rrRender" | "__rrMount" = "__rrRender",
) {
  validateFiles(files);
  const patched = patchSource(files, patch);
  files = patched.files;
  if (!files.some((f) => f.path === entry))
    throw Error("Entry file not found.");
  const modules = files
    .filter((f) => /\.[cm]?[jt]sx?$/.test(f.path) || f.path.endsWith(".css"))
    .map(
      (f) =>
        `${JSON.stringify(f.path)}:function(module,exports,require){${
          f.path.endsWith(".css")
            ? f.path.endsWith(".module.css")
              ? "throw Error('CSS modules are unsupported. Use a plain local stylesheet.');"
              : `__rrStylePaths.add(${JSON.stringify(f.path)});`
            : instrument(
                f,
                patched.originalLine,
                renderFunction === "__rrMount",
              )
        }\n}`,
    )
    .join(",");
  const bootstrap = `const __rrModules=Object.assign(Object.create(null),{${modules}});const __rrCache=Object.create(null);function __rrLoad(path,from=''){if(path==='react')return __rrReact;if(path==='react/jsx-runtime')throw Error('Use source JSX; precompiled JSX runtime imports are unsupported.');let target=path;if(path.startsWith('.')){const parts=from.split('/').slice(0,-1);for(const p of path.split('/')){if(p==='..')parts.pop();else if(p!=='.')parts.push(p);}target=parts.join('/');}target=[target,target+'.ts',target+'.tsx',target+'.js',target+'.jsx',target+'/index.tsx',target+'/index.ts',target+'/index.jsx',target+'/index.js'].find(p=>__rrModules[p]);if(!target)throw Error('Unsupported dependency: '+path);if(__rrCache[target])return __rrCache[target].exports;const module={exports:{}};__rrCache[target]=module;__rrModules[target](module,module.exports,p=>__rrLoad(p,target));return module.exports;}const __rrExports=__rrLoad(${JSON.stringify(entry)});const __rrComponent=__rrExports[${JSON.stringify(exportName)}];if(typeof __rrComponent!=='function')throw Error('Select an exported React component.');${renderFunction}(__rrReact.createElement(__rrComponent,${JSON.stringify(props)}));`;
  return "const __rrStylePaths=new Set();" + bootstrap;
}
export async function renderPreview(
  files: SourceFile[],
  entry: string,
  exportName: string,
  props: unknown = {},
  patch?: SourcePatch,
) {
  const bootstrap = previewBootstrap(files, entry, exportName, props, patch);
  const Q = await getQuickJS(),
    rt = Q.newRuntime();
  rt.setMemoryLimit(48 * 1024 * 1024);
  rt.setMaxStackSize(1024 * 1024);
  const deadline = Date.now() + 1000;
  rt.setInterruptHandler(() => Date.now() > deadline);
  const vm = rt.newContext();
  function exec(code: string) {
    const r = vm.evalCode(code);
    if (r.error) {
      const e = vm.dump(r.error);
      r.error.dispose();
      throw Error(e.message ?? "Preview runtime error");
    }
    const value = vm.dump(r.value);
    r.value.dispose();
    return value;
  }
  try {
    exec(runtime);
    const html = exec(bootstrap);
    if (typeof html !== "string") throw Error("Renderer returned no HTML.");
    const styles = collectPreviewStyles(
      files,
      exec("Array.from(__rrStylePaths)"),
    );
    return { html: sanitizePreview(html), ...styles, entry, exportName };
  } finally {
    vm.dispose();
    rt.dispose();
  }
}
