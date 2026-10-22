import { afterEach, expect, it, vi } from "vitest";
import { decodePublicGithubBlob, githubImport } from "../src/core/import";

afterEach(() => vi.unstubAllGlobals());

it("preserves line-wrapped Unicode source in public GitHub blobs", () => {
  const source = "export const greeting = 'नमस्ते 🧪';";
  const bytes = Buffer.from(source, "utf8");
  const wrapped = bytes.toString("base64").replace(/.{20}/g, "$&\n");
  expect(
    decodePublicGithubBlob({ encoding: "base64", size: bytes.length, content: wrapped }, bytes.length),
  ).toBe(source);
});

it("rejects mismatched size and noncanonical base64", () => {
  expect(() => decodePublicGithubBlob({ encoding: "base64", size: 1, content: "YQ==" }, 2)).toThrow(/mismatch/);
  expect(() => decodePublicGithubBlob({ encoding: "base64", size: 1, content: "Zh==" }, 1)).toThrow(/mismatch/);
  expect(() => decodePublicGithubBlob({ encoding: "base64", size: 1, content: "YQ=" }, 1)).toThrow(/Unsupported/);
});

it("rejects invalid UTF-8, negative sizes and oversized source", () => {
  expect(() => decodePublicGithubBlob({ encoding: "base64", size: 2, content: "wyg=" }, 2)).toThrow(/not valid UTF-8/);
  expect(() => decodePublicGithubBlob({ encoding: "base64", size: -1, content: "YQ==" }, -1)).toThrow(/Unsupported/);
  expect(() => decodePublicGithubBlob({ encoding: "base64", size: 131073, content: "YQ==" }, 131073)).toThrow(/Unsupported/);
});

function stubPublicGithub(options: { treeSize: number; blobSize: number; content: string }) {
  const commitSha = "a".repeat(40);
  const blobSha = "b".repeat(40);
  const urls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => {
    const url = String(input);
    urls.push(url);
    if (url.endsWith("/repos/sample/project"))
      return Response.json({ default_branch: "main" });
    if (url.endsWith("/commits/main"))
      return Response.json({ sha: commitSha });
    if (url.includes("/git/trees/"))
      return Response.json({ truncated: false, tree: [{ path: "src/hello.ts", type: "blob", mode: "100644", size: options.treeSize, sha: blobSha }] });
    if (url.includes("/git/blobs/"))
      return Response.json({ encoding: "base64", size: options.blobSize, content: options.content });
    throw Error(`Unexpected request: ${url}`);
  }));
  return urls;
}

it("imports valid public GitHub source without changing its bytes", async () => {
  const source = "export const hello = '🌍';";
  const bytes = Buffer.from(source, "utf8");
  const urls = stubPublicGithub({ treeSize: bytes.length, blobSize: bytes.length, content: bytes.toString("base64") });
  const result = await githubImport("https://github.com/sample/project", () => {});
  expect(result.files).toEqual([{ path: "src/hello.ts", content: source }]);
  expect(result.origin).toContain("/tree/" + "a".repeat(40));
  expect(urls).toHaveLength(4);
});

it("rejects negative GitHub tree metadata before fetching any blob", async () => {
  const urls = stubPublicGithub({ treeSize: -1, blobSize: 1, content: "YQ==" });
  await expect(githubImport("https://github.com/sample/project", () => {})).rejects.toThrow(/source limits/);
  expect(urls).toHaveLength(3);
});

it("rejects public GitHub blob size mismatches instead of importing altered code", async () => {
  stubPublicGithub({ treeSize: 2, blobSize: 1, content: "YQ==" });
  await expect(githubImport("https://github.com/sample/project", () => {})).rejects.toThrow(/mismatch/);
});
