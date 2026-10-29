import { expect, it, vi } from "vitest";
import {
  readLinkedFolder,
  folderChanges,
  type FolderHandle,
  type FolderEntry,
} from "../src/core/linkedFolder";
const file = (name: string, text: string): FolderEntry => ({
  kind: "file",
  name,
  getFile: async () => new File([text], name),
});
const dir = (name: string, entries: FolderEntry[]): FolderHandle => ({
  kind: "directory",
  name,
  async *values() {
    yield* entries;
  },
});
it("reads supported source in deterministic order without opening hidden or generated files", async () => {
  const denied = vi.fn(async () => {
    throw Error("must not open");
  });
  const root = dir("project", [
    file("b.ts", "export const b=2"),
    dir("src", [file("a.ts", "export const a=1")]),
    { kind: "file", name: ".env.ts", getFile: denied },
    dir("node_modules", [{ kind: "file", name: "secret.ts", getFile: denied }]),
    dir(".aws", [{ kind: "file", name: "secret.ts", getFile: denied }]),
    { kind: "file", name: "image.png", getFile: denied },
  ]);
  expect(await readLinkedFolder(root)).toEqual([
    { path: "b.ts", content: "export const b=2" },
    { path: "src/a.ts", content: "export const a=1" },
  ]);
  expect(denied).not.toHaveBeenCalled();
});
it("counts additions, removals and content changes, not ordering", () => {
  expect(
    folderChanges(
      [
        { path: "a.ts", content: "a" },
        { path: "b.ts", content: "b" },
        { path: "c.ts", content: "c" },
      ],
      [
        { path: "c.ts", content: "c" },
        { path: "a.ts", content: "updated" },
        { path: "d.ts", content: "new" },
      ],
    ),
  ).toEqual({ added: 1, changed: 1, removed: 1 });
});
it("rejects oversized files before reading content", async () => {
  const text = vi.fn();
  const entry = {
    kind: "file" as const,
    name: "a.ts",
    getFile: async () => ({ size: 128 * 1024 + 1, text }) as unknown as File,
  };
  await expect(readLinkedFolder(dir("p", [entry]))).rejects.toThrow("limits");
  expect(text).not.toHaveBeenCalled();
});
it("rejects excessive file counts", async () => {
  await expect(
    readLinkedFolder(
      dir(
        "p",
        Array.from({ length: 201 }, (_, i) => file(`${i}.ts`, "a")),
      ),
    ),
  ).rejects.toThrow("200");
});
it("rejects unsafe names and empty source folders", async () => {
  await expect(
    readLinkedFolder(dir("p", [file("../a.ts", "a")])),
  ).rejects.toThrow("unsafe");
  await expect(
    readLinkedFolder(dir("p", [file("image.png", "x")])),
  ).rejects.toThrow("No supported");
});
it("honors cancellation before reading", async () => {
  const values = vi.fn();
  const controller = new AbortController();
  controller.abort();
  await expect(
    readLinkedFolder(
      { kind: "directory", name: "p", values },
      controller.signal,
    ),
  ).rejects.toThrow();
  expect(values).not.toHaveBeenCalled();
});
it("propagates revoked access instead of presenting missing files as deletions", async () => {
  const root: FolderHandle = {
    kind: "directory",
    name: "p",
    async *values() {
      throw new DOMException("Permission denied", "NotAllowedError");
    },
  };
  await expect(readLinkedFolder(root)).rejects.toThrow("Permission denied");
});
it("bounds traversal even for unsupported entries", async () => {
  await expect(
    readLinkedFolder(
      dir(
        "p",
        Array.from({ length: 5001 }, (_, i) => file(`${i}.png`, "")),
      ),
    ),
  ).rejects.toThrow("too many entries");
});
