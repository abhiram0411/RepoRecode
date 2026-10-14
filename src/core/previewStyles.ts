import { parse, walk, generate, type CssNode, type List } from "css-tree";
import type { SourceFile } from "./types";

const properties = new Set(
  (
    "color background background-color background-image display visibility opacity " +
    "box-sizing width height min-width max-width min-height max-height " +
    "margin margin-top margin-right margin-bottom margin-left margin-inline margin-block " +
    "padding padding-top padding-right padding-bottom padding-left padding-inline padding-block " +
    "border border-width border-color border-style border-radius border-top border-right border-bottom border-left " +
    "font font-family font-size font-weight font-style line-height letter-spacing text-align text-decoration text-transform " +
    "white-space word-break overflow-wrap overflow overflow-x overflow-y " +
    "flex flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-self align-content justify-content " +
    "gap row-gap column-gap grid-template-columns grid-template-rows grid-column grid-row grid-auto-flow place-items " +
    "box-shadow list-style-type cursor outline outline-color outline-style outline-width outline-offset vertical-align"
  ).split(/\s+/),
);
const functions = new Set(
  "rgb rgba hsl hsla hwb lab lch oklab oklch calc min max clamp var repeat minmax linear-gradient radial-gradient".split(
    " ",
  ),
);
const valueNodes = new Set(
  "Value Identifier Number Dimension Percentage Hash Operator Function Parentheses String".split(
    " ",
  ),
);
const pseudos = new Set(
  "root hover focus focus-visible focus-within active checked disabled enabled first-child last-child only-child empty".split(
    " ",
  ),
);
const name = /^[-_a-zA-Z][-_a-zA-Z0-9]*$/;

function boundedTree(ast: CssNode) {
  let nodes = 0;
  walk(ast, () => {
    if (++nodes > 20000)
      throw Error("Stylesheet exceeds the 20,000-node preview limit.");
  });
}
function safeValue(value: CssNode) {
  let safe = true;
  walk(value, (node) => {
    if (!valueNodes.has(node.type)) safe = false;
    if (node.type === "Function" && !functions.has(node.name.toLowerCase()))
      safe = false;
    if (node.type === "Identifier" && !/^[-_a-zA-Z0-9]+$/.test(node.name))
      safe = false;
    if (
      node.type === "Dimension" &&
      !/^(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|fr|deg|turn)$/i.test(node.unit)
    )
      safe = false;
  });
  return safe;
}
function declaration(node: CssNode): string | null {
  if (node.type !== "Declaration" || !safeValue(node.value)) return null;
  const property = node.property.toLowerCase();
  if (!properties.has(property) && !/^--[a-zA-Z][\w-]{0,80}$/.test(property))
    return null;
  return generate(node);
}
function selector(node: CssNode) {
  let safe = true,
    count = 0;
  walk(node, (n) => {
    if (++count > 100) safe = false;
    switch (n.type) {
      case "SelectorList":
      case "Selector":
        break;
      case "TypeSelector":
        if (n.name !== "*" && !name.test(n.name)) safe = false;
        break;
      case "ClassSelector":
      case "IdSelector":
        if (!name.test(n.name)) safe = false;
        break;
      case "Combinator":
        if (![" ", ">", "+", "~"].includes(n.name)) safe = false;
        break;
      case "PseudoClassSelector":
        if (!pseudos.has(n.name.toLowerCase()) || n.children) safe = false;
        break;
      default:
        safe = false;
    }
  });
  return safe;
}
// Only worker-generated CSS reaches the frame; never pass original stylesheet
// text through. URL nodes, arbitrary functions, raw recovery nodes, external
// fonts/imports, pseudo elements and animations are excluded by allowlists.
export function sanitizeStylesheet(text: string) {
  if (text.length > 128 * 1024) throw Error("Stylesheet exceeds 128 KiB.");
  const ast = parse(text, { parseCustomProperty: true });
  boundedTree(ast);
  let omitted = 0,
    rules = 0,
    declarations = 0;
  function render(children: List<CssNode>, depth = 0): string {
    const output: string[] = [];
    for (const node of children) {
      if (++rules > 1000) throw Error("Stylesheet exceeds 1,000 rules.");
      if (node.type === "Rule" && selector(node.prelude)) {
        const body: string[] = [];
        for (const child of node.block.children) {
          if (++declarations > 3000)
            throw Error("Stylesheet exceeds 3,000 declarations.");
          const safe = declaration(child);
          if (safe) body.push(safe);
          else omitted++;
        }
        if (body.length)
          output.push(`${generate(node.prelude)}{${body.join(";")}}`);
      } else if (
        node.type === "Atrule" &&
        node.name.toLowerCase() === "media" &&
        node.prelude &&
        node.block &&
        depth < 4
      ) {
        const condition = generate(node.prelude);
        if (
          condition.length <= 300 &&
          /^[a-zA-Z0-9\s:().,%+-]+$/.test(condition)
        ) {
          output.push(
            `@media ${condition}{${render(node.block.children, depth + 1)}}`,
          );
        } else omitted++;
      } else omitted++;
    }
    return output.join("");
  }
  if (ast.type !== "StyleSheet") throw Error("Invalid stylesheet.");
  // Escape HTML's raw-text closing delimiter even inside quoted CSS strings.
  const css = render(ast.children).replace(/</g, "\\3c ");
  return { css, omitted };
}
export function sanitizeInlineStyle(text: string) {
  if (text.length > 8000) return "";
  try {
    const ast = parse(text, {
      context: "declarationList",
      parseCustomProperty: true,
    });
    if (ast.type !== "DeclarationList" || ast.children.size > 100) return "";
    boundedTree(ast);
    return ast.children.toArray().map(declaration).filter(Boolean).join(";");
  } catch {
    return "";
  }
}
export function collectPreviewStyles(files: SourceFile[], loaded: unknown) {
  const collector = createPreviewStyleCollector(files);
  try {
    return collector.collect(loaded);
  } finally {
    collector.dispose();
  }
}

// One immutable source snapshot per preview session. Never reuse sanitation
// across changed snapshots or trust VM-supplied paths without checking them.
export function createPreviewStyleCollector(files: SourceFile[]) {
  const styles = new Map(
    files
      .filter((f) => f.path.endsWith(".css"))
      .map((f) => [f.path, f.content]),
  );
  const cache = new Map<string, ReturnType<typeof sanitizeStylesheet>>();
  let disposed = false;
  return {
    collect(loaded: unknown) {
      if (disposed) throw Error("Preview stylesheet session ended.");
      if (
        !Array.isArray(loaded) ||
        loaded.length > 200 ||
        loaded.some((p) => typeof p !== "string")
      )
        throw Error("Invalid loaded stylesheet list.");
      const paths = [...new Set<string>(loaded)];
      // Check the entire list and total before parsing anything new.
      let total = 0;
      for (const path of paths) {
        const content = styles.get(path);
        if (content === undefined)
          throw Error("Loaded stylesheet is outside the imported snapshot.");
        total += content.length;
        if (total > 256 * 1024)
          throw Error("Loaded stylesheets exceed the 256 KiB preview limit.");
      }
      const parts: string[] = [],
        styleWarnings: string[] = [];
      for (const path of paths) {
        let result = cache.get(path);
        if (!result) {
          result = sanitizeStylesheet(styles.get(path)!);
          cache.set(path, result);
        }
        parts.push(result.css);
        if (result.omitted)
          styleWarnings.push(
            `${path}: ${result.omitted} unsupported CSS rules or declarations omitted.`,
          );
      }
      return { css: parts.join("\n"), styleWarnings };
    },
    dispose() {
      disposed = true;
      cache.clear();
      styles.clear();
    },
  };
}
