import { allowed, LIMITS, safePath, validateFiles } from "./import";
import type { SourceFile } from "./types";

export type FolderEntry =
  { kind: "file"; name: string; getFile(): Promise<File> } | FolderHandle;
export type FolderHandle = {
  kind: "directory";
  name: string;
  values(): AsyncIterableIterator<FolderEntry>;
};
const excluded = new Set(["node_modules", "dist", "build", "coverage"]);
// Read-only browser capability: handles are never persisted or sent to a server.
export async function readLinkedFolder(
  handle: FolderHandle,
  signal?: AbortSignal,
): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  let visited = 0,
    total = 0;
  async function walk(dir: FolderHandle, prefix: string, depth: number) {
    signal?.throwIfAborted();
    if (depth > 20)
      throw Error(
        "Folder is too deeply nested. Choose a smaller source folder.",
      );
    for await (const entry of dir.values()) {
      signal?.throwIfAborted();
      if (++visited > 5000)
        throw Error(
          "Folder has too many entries. Choose a smaller source folder.",
        );
      if (!safePath(entry.name) || entry.name.includes("/"))
        throw Error("Folder contains an unsafe entry name.");
      if (entry.name.startsWith(".")) continue;
      const path = prefix + entry.name;
      if (entry.kind === "directory") {
        if (!excluded.has(entry.name)) await walk(entry, path + "/", depth + 1);
      } else if (allowed(path)) {
        if (files.length >= LIMITS.files)
          throw Error("Folder exceeds 200 source files.");
        const file = await entry.getFile();
        signal?.throwIfAborted();
        if (
          file.size > LIMITS.fileBytes ||
          (total += file.size) > LIMITS.totalBytes
        )
          throw Error(
            "Folder exceeds source limits: 128 KiB per file, 2 MiB total.",
          );
        const content = await file.text();
        signal?.throwIfAborted();
        files.push({ path, content });
      }
    }
  }
  await walk(handle, "", 0);
  return validateFiles(
    files.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
  );
}
export function folderChanges(before: SourceFile[], after: SourceFile[]) {
  const previous = new Map(before.map((f) => [f.path, f.content]));
  let added = 0,
    changed = 0;
  for (const file of after) {
    if (!previous.has(file.path)) added++;
    else if (previous.get(file.path) !== file.content) changed++;
    previous.delete(file.path);
  }
  return { added, changed, removed: previous.size };
}
