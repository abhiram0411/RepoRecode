import { describe, it, expect } from "vitest";
// @ts-expect-error Injected JavaScript integration boundaries.
import { seal, unseal, createGithubIntegration } from "../server/github.mjs";
const key = Buffer.alloc(32, 7).toString("base64");
describe("GitHub credential boundaries", () => {
  it("encrypts tokens and rejects modified ciphertext", () => {
    const encrypted = seal({ token: "private-token" }, key);
    expect(encrypted).not.toContain("private-token");
    expect(unseal(encrypted, key)).toEqual({ token: "private-token" });
    const b = Buffer.from(encrypted, "base64");
    b[30] ^= 1;
    expect(() => unseal(b.toString("base64"), key)).toThrow();
  });
  it("fails closed with missing app configuration", () => {
    expect(createGithubIntegration({ env: {}, db: {} })).toBeNull();
  });
});
