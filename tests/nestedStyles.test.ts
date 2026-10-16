import { describe, expect, it } from "vitest";
import {
  sanitizeStylesheet,
  sanitizeInlineStyle,
} from "../src/core/previewStyles";

describe("bounded native CSS nesting", () => {
  it("preserves nested selectors, sibling declarations and source order", () => {
    const result = sanitizeStylesheet(
      ".card{color:red;&:hover{color:blue}& .child{padding:2px}color:green;&>.child{font-weight:bold}}",
    );
    expect(result).toEqual({
      css: ".card{color:red;&:hover{color:blue}& .child{padding:2px}color:green;&>.child{font-weight:bold}}",
      omitted: 0,
    });
  });
  it("reports parser recovery syntax instead of passing raw implicit nesting through", () => {
    const result = sanitizeStylesheet(
      ".card{.child{color:red} color:blue;& .safe{color:green}}",
    );
    expect(result.omitted).toBeGreaterThan(0);
    expect(result.css).not.toContain(".child");
    expect(result.css).toContain("& .safe{color:green}");
  });
  it("allows safe media declarations inside a rule and nesting inside outer media", () => {
    const result = sanitizeStylesheet(
      "@media (min-width:1px){.card{color:red;&>.child{color:blue}@media (max-width:900px){color:green}}}",
    );
    expect(result.omitted).toBe(0);
    expect(result.css).toContain("&>.child{color:blue}");
    expect(result.css).toContain("@media (max-width:900px){color:green}");
  });
  it("rejects top-level nesting selectors and never expands a selector product", () => {
    expect(
      sanitizeStylesheet("&{color:red}@media screen{&:hover{color:blue}}").css,
    ).not.toContain("color:");
    const css = ".a,.b,.c{& .x,& .y{& .p,& .q{color:red}}}";
    const result = sanitizeStylesheet(css);
    expect(result.omitted).toBe(0);
    expect(result.css.length).toBeLessThanOrEqual(css.length);
  });
  it("applies the same fetching/value/selector restrictions at every depth", () => {
    const result = sanitizeStylesheet(
      `.card{&:hover{background:url(https://evil.test/x);--x:url(https://evil.test/y);color:red}&[data-secret]{color:blue}&::before{content:'x'}@import 'https://evil.test/z';@font-face{src:url(https://evil.test/font)}}`,
    );
    expect(result.css).toBe(".card{&:hover{color:red}}");
    expect(result.omitted).toBe(6);
    expect(sanitizeInlineStyle("color:red;&:hover{color:blue}")).not.toContain(
      "&",
    );
  });
  it("omits deeper blocks while preserving supported declarations", () => {
    const result = sanitizeStylesheet(
      ".a{color:red;& .b{& .c{& .d{color:blue;& .e{color:green}}}}}",
    );
    expect(result.omitted).toBe(1);
    expect(result.css).toContain("color:blue");
    expect(result.css).not.toContain("color:green");
  });
  it("retains global rule and declaration budgets across nested blocks", () => {
    expect(() =>
      sanitizeStylesheet(".a{" + "&:hover{color:red}".repeat(1000) + "}"),
    ).toThrow("1,000");
    expect(() =>
      sanitizeStylesheet(".a{&:hover{" + "color:red;".repeat(3001) + "}}"),
    ).toThrow("3,000");
  });
  it("escapes HTML closing delimiters inside nested quoted values", () => {
    const result = sanitizeStylesheet(
      '.a{& .b{font-family:"</style><script>x</script>";color:red}}',
    );
    expect(result.css).not.toContain("<");
    expect(result.css).toContain("color:red");
  });
});
