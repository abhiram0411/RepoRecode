import { it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { palettes } from "../src/core/themes";
import { reactionForResult } from "../src/core/pet";
import { validatePreferences } from "../src/core/preferences";
import Avatar from "../src/components/Avatar";
import type { Evaluation, Preferences } from "../src/core/types";
const prefs: Preferences = {
  level: "beginner",
  goal: "understand",
  theme: "dark",
  tutor: "robot",
  color: "#c5eb82",
  muted: true,
  motion: true,
  name: "Explorer",
  visual: true,
};
function contrast(a: string, b: string) {
  const luminance = (c: string) => {
    const v = c
      .slice(1)
      .match(/../g)!
      .map((x) => parseInt(x, 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return v[0] * 0.2126 + v[1] * 0.7152 + v[2] * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
it("provides complete, readable palettes accepted by stored preference validation", () => {
  expect(palettes.length).toBeGreaterThanOrEqual(12);
  for (const p of palettes) {
    expect(validatePreferences({ ...prefs, theme: p.id }).theme).toBe(p.id);
    for (const bg of ["bg", "panel", "panel2"])
      for (const fg of [
        "text",
        "muted",
        "accent",
        "danger",
        "warning",
        "success",
      ])
        expect(
          contrast(p.colors[fg], p.colors[bg]),
          `${p.id}: ${fg} on ${bg}`,
        ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(p.colors.accent, p.colors["accent-text"]),
      p.id,
    ).toBeGreaterThanOrEqual(4.5);
  }
});
it("has distinct character geometry and permits combined accessories on every preset", () => {
  const art = (tutor: Preferences["tutor"]) =>
    renderToStaticMarkup(
      createElement(Avatar, {
        prefs: { ...prefs, tutor, cap: true, glasses: true },
      }),
    );
  for (const type of ["robot", "boy", "girl"] as const) {
    expect(art(type)).toContain('data-accessory="cap"');
    expect(art(type)).toContain('data-accessory="glasses"');
  }
  expect(art("boy").match(/d="[^"]+"/g)).not.toEqual(
    art("girl").match(/d="[^"]+"/g),
  );
});
it("reacts to verified checks and never treats unsupported evaluation as failure", () => {
  const result: Evaluation = {
    supported: true,
    passed: false,
    diagnostics: [],
    cases: [],
    note: "",
  };
  expect(reactionForResult(result)).toBe("frustrated");
  expect(reactionForResult({ ...result, supported: false })).toBe("watching");
  expect(reactionForResult({ ...result, passed: true })).toBe("celebrating");
  expect(reactionForResult({ ...result, passed: true }, true)).toBe(
    "achievement",
  );
});
