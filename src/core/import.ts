import { unzipSync } from "fflate";
import type { SourceFile } from "./types";
export const LIMITS = {
  files: 200,
  fileBytes: 128 * 1024,
  totalBytes: 2 * 1024 * 1024,
  zipBytes: 5 * 1024 * 1024,
};
export function safePath(path: string) {
  return (
    !!path &&
    !path.includes("\\") &&
    !path.startsWith("/") &&
    !path.includes(":") &&
    !path.split("/").some((p) => p === ".." || p === "." || !p) &&
    !/[\x00-\x1f]/.test(path)
  );
}
export function allowed(path: string) {
  return (
    safePath(path) &&
    !path
      .split("/")
      .some(
        (p) =>
          [
            "node_modules",
            ".git",
            "dist",
            "build",
            "coverage",
            ".next",
            ".env",
          ].includes(p) || p.startsWith(".env"),
      ) &&
    (/\.[cm]?[jt]sx?$/.test(path) ||
      path.endsWith(".css") ||
      path === "package.json" ||
      path.endsWith("/package.json")) &&
    !/\.min\.[jt]s$/.test(path)
  );
}
export function validateFiles(files: SourceFile[]) {
  if (files.length > LIMITS.files)
    throw Error(`Limit: ${LIMITS.files} source files.`);
  let total = 0;
  const seen = new Set<string>();
  for (const f of files) {
    if (!allowed(f.path) || seen.has(f.path))
      throw Error(`Unsupported, duplicate or unsafe path: ${f.path}`);
    seen.add(f.path);
    const size = new TextEncoder().encode(f.content).length;
    if (size > LIMITS.fileBytes) throw Error(`File exceeds 128 KiB: ${f.path}`);
    total += size;
  }
  if (total > LIMITS.totalBytes)
    throw Error("Source exceeds 2 MiB. Import a smaller module.");
  if (!files.length) throw Error("No supported source files found.");
  return files;
}
export async function folderImport(list: FileList | File[]) {
  const fs = Array.from(list).filter((f) =>
    allowed(f.webkitRelativePath || f.name),
  );
  let files: SourceFile[] = [];
  let total = 0;
  for (const f of fs) {
    if (
      f.size > LIMITS.fileBytes ||
      (total += f.size) > LIMITS.totalBytes ||
      files.length >= LIMITS.files
    )
      throw Error(
        "Import exceeds source limits: 200 files, 128 KiB each, 2 MiB total.",
      );
    files.push({
      path: f.webkitRelativePath || f.name,
      content: await f.text(),
    });
  }
  return validateFiles(stripRoot(files));
}
function stripRoot(files: SourceFile[]) {
  const root = files[0]?.path.split("/")[0];
  return files.every((f) => f.path.startsWith(root + "/"))
    ? files.map((f) => ({ ...f, path: f.path.slice(root.length + 1) }))
    : files;
}
export function zipImport(bytes: Uint8Array) {
  if (bytes.length > LIMITS.zipBytes) throw Error("ZIP exceeds 5 MiB.");
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (v.getUint32(i, true) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw Error("Invalid ZIP directory.");
  const count = v.getUint16(end + 10, true),
    offset = v.getUint32(end + 16, true);
  if (count > 2000 || v.getUint16(end + 4, true) || v.getUint16(end + 6, true))
    throw Error("Unsupported archive.");
  let p = offset,
    total = 0,
    n = 0;
  const seenSourcePaths = new Set<string>();
  for (let i = 0; i < count; i++) {
    if (p + 46 > end || v.getUint32(p, true) !== 0x02014b50)
      throw Error("Invalid ZIP entry.");
    const size = v.getUint32(p + 24, true),
      len = v.getUint16(p + 28, true),
      extra = v.getUint16(p + 30, true),
      comment = v.getUint16(p + 32, true);
    if (p + 46 + len + extra + comment > end)
      throw Error("Invalid ZIP entry.");
    const name = new TextDecoder().decode(bytes.slice(p + 46, p + 46 + len));
    if (!safePath(name.replace(/\/$/, ""))) throw Error("Unsafe ZIP path.");
    if (
      ((v.getUint32(p + 38, true) >>> 16) & 0xf000) === 0xa000 ||
      v.getUint16(p + 8, true) & 1
    )
      throw Error("Symlinks/encrypted ZIPs are unsupported.");
    if (allowed(name)) {
      if (seenSourcePaths.has(name))
        throw Error(`Duplicate ZIP source path: ${name}`);
      seenSourcePaths.add(name);
      total += size;
      n++;
      if (
        size > LIMITS.fileBytes ||
        total > LIMITS.totalBytes ||
        n > LIMITS.files
      )
        throw Error("Archive expands beyond source limits.");
    }
    p += 46 + len + extra + comment;
  }
  const output = unzipSync(bytes, {
    filter: (f) => {
      if (
        allowed(f.name) &&
        (f.originalSize > LIMITS.fileBytes || f.originalSize === 0xffffffff)
      )
        throw Error("Invalid ZIP size.");
      return allowed(f.name);
    },
  });
  return validateFiles(
    stripRoot(
      Object.entries(output).map(([path, b]) => ({
        path,
        content: new TextDecoder("utf-8", { fatal: true }).decode(b),
      })),
    ),
  );
}
export function githubRepo(url: string) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.hostname !== "github.com" ||
    u.username ||
    u.password ||
    u.port ||
    u.search ||
    u.hash
  )
    throw Error("Use an HTTPS github.com repository URL.");
  const parts = u.pathname.replace(/\/$/, "").split("/").filter(Boolean);
  if (parts.length !== 2 || parts.some((p) => !/^[\w.-]+$/.test(p)))
    throw Error(
      "Use https://github.com/owner/repository without a branch path.",
    );
  return { owner: parts[0], repo: parts[1].replace(/\.git$/, "") };
}
export async function githubImport(url: string, progress: (s: string) => void) {
  const { owner, repo } = githubRepo(url);
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  async function get(path: string) {
    const r = await fetch(base + path, {
      signal: AbortSignal.timeout(20000),
      redirect: "error",
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!r.ok)
      throw Error(
        `GitHub ${r.status}: repository unavailable or rate limit reached.`,
      );
    return r.json();
  }
  progress("Reading repository metadata…");
  const meta = await get("");
  const commit = await get(
    `/commits/${encodeURIComponent(meta.default_branch)}`,
  );
  const tree = await get(`/git/trees/${commit.sha}?recursive=1`);
  if (tree.truncated)
    throw Error("Repository tree too large. Import a local subfolder.");
  const selected = tree.tree.filter(
    (f: { path: string; type: string; size: number; mode: string }) =>
      f.type === "blob" && f.mode !== "120000" && allowed(f.path),
  );
  if (
    selected.length > LIMITS.files ||
    selected.reduce((a: number, b: { size: number }) => a + b.size, 0) >
      LIMITS.totalBytes ||
    selected.some((f: { size: number }) => f.size > LIMITS.fileBytes)
  )
    throw Error("Repository exceeds source limits. Import a local subfolder.");
  const files: SourceFile[] = [];
  for (const f of selected) {
    progress(`Reading ${files.length + 1}/${selected.length}: ${f.path}`);
    const blob = await get(`/git/blobs/${f.sha}`);
    if (blob.encoding !== "base64" || blob.size > LIMITS.fileBytes)
      throw Error("Unsupported GitHub blob.");
    const raw = Uint8Array.from(atob(blob.content.replace(/\s/g, "")), (c) =>
      c.charCodeAt(0),
    );
    files.push({
      path: f.path,
      content: new TextDecoder("utf-8", { fatal: true }).decode(raw),
    });
  }
  return {
    files: validateFiles(files),
    name: `${owner}/${repo}`,
    origin: `https://github.com/${owner}/${repo}/tree/${commit.sha}`,
  };
}
