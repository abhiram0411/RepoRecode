import { it, expect } from "vitest";
import { analyze } from "../src/core/analyze";
it("explains actual arithmetic, guards and implicit returns without a model", () => {
  const analysis = analyze([
    {
      path: "math.ts",
      content:
        "export function ratio(n:number,total:number){if(total<=0)return 0;return n/total;}\nexport const double = (n:number) => n*2;",
    },
  ]);
  const ratio = analysis.symbols.find((s) => s.name === "ratio")!,
    double = analysis.symbols.find((s) => s.name === "double")!;
  expect(ratio.steps?.map((s) => s.text).join(" ")).toContain(
    "total is at most 0",
  );
  expect(ratio.steps?.map((s) => s.text).join(" ")).toContain(
    "n divided by total",
  );
  expect(double.steps?.[0].text).toContain(
    "Implicitly returns (n multiplied by 2)",
  );
});
