import { expect, it } from "vitest";
// @ts-expect-error JavaScript module tested from TypeScript.
import { decodeGithubBlob } from "../server/github.mjs";

it("preserves Unicode source from line-wrapped GitHub base64", () => {
  const source = "export const text = 'Hello 🌍';";
  const bytes = Buffer.from(source, "utf8");
  const content = bytes.toString("base64").replace(/.{40}/g, "$&\n");
  expect(decodeGithubBlob({ encoding: "base64", size: bytes.length, content })).toBe(source);
});
it("rejects invalid UTF-8 source", () => {
  const bytes = Buffer.from([0xc3, 0x28]);
  expect(() => decodeGithubBlob({ encoding: "base64", size: 2, content: bytes.toString("base64") })).toThrow("not valid UTF-8");
});
it("rejects mismatched size and noncanonical base64", () => {
  expect(() => decodeGithubBlob({ encoding: "base64", size: 2, content: "YQ==" })).toThrow("mismatch");
  expect(() => decodeGithubBlob({ encoding: "base64", size: 1, content: "Zh==" })).toThrow("mismatch");
});
