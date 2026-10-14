import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const skip = new Set([
  "node_modules",
  "dist",
  ".git",
  ".openai",
  "artifacts",
  "test-results",
  ".agents",
  ".codex",
  "tmp",
]);
const findings = [];
let files = 0;
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || skip.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (entry.name.startsWith(".env") && entry.name !== ".env.example") {
      findings.push({ path, reason: "Environment file must not be published" });
      continue;
    }
    if (!/\.(ts|tsx|js|mjs|json|md|yaml|yml|html|css|sql)$/.test(path))
      continue;
    files++;
    const text = await readFile(path, "utf8");
    if (
      /(?:gh[pousr]_[A-Za-z0-9]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(
        text,
      )
    )
      findings.push({ path, reason: "Potential embedded secret" });
  }
}
await walk(".");
console.log(
  JSON.stringify(
    {
      filesScanned: files,
      findings,
      scope:
        "Heuristic scan for common token and private-key formats; not a complete secret detector.",
    },
    null,
    2,
  ),
);
if (findings.length) process.exitCode = 1;
