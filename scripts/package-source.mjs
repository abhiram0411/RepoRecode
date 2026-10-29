import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { zipSync } from "fflate";
const root = resolve("."),
  entries = {};
const directories = [
  "api",
  "src",
  "server",
  "scripts",
  "tests",
  "e2e",
  "docs",
  "deploy",
  "supabase",
  ".github",
];
async function add(path) {
  const key = relative(root, path).replaceAll("\\", "/");
  if (key.includes("/__pycache__/") || key.endsWith(".pyc")) return;
  entries["reporecode/" + key] = [
    new Uint8Array(await readFile(path)),
    { mtime: new Date("2026-01-01T00:00:00Z") },
  ];
}
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const full = join(path, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) await walk(full);
    else await add(full);
  }
}
for (const dir of directories) await walk(join(root, dir));
for (const file of [
  "package.json",
  "package-lock.json",
  "index.html",
  "vite.config.ts",
  "vercel.json",
  "vitest.config.ts",
  "playwright.config.ts",
  "tsconfig.json",
  "Dockerfile",
  "compose.yaml",
  ".dockerignore",
  ".gitignore",
  ".env.example",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "THIRD_PARTY_NOTICES.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "CHANGELOG.md",
  "ROADMAP.md",
])
  await add(join(root, file));
for (const file of [
  "overview.png",
  "practice.png",
  "react-preview.png",
  "interactive-preview.png",
  "styled-preview.png",
  "nested-styles.png",
  "css-modules.png",
  "keyboard-navigation.png",
  "generic-async-practice.png",
  "api-paths.png",
  "api-paths-mobile.png",
  "source-location.png",
  "state-relationships.png",
  "state-derivations.png",
  "object-practice.png",
  "named-practice.png",
  "inherited-practice.png",
  "nested-practice.png",
  "support-mobile.png",
  "public-feedback-mobile.png",
  "startup-recovery.png",
  "profile.png",
  "themes.png",
  "community-admin.png",
  "mobile.png",
  "unit-results.json",
  "browser-results.json",
  "firefox-browser-results.json",
  "dev-browser-results.json",
  "deployment-unit-results.json",
  "deployment-browser-results.json",
  "dependency-audit.json",
  "public-verification.json",
  "github-ci-ebf3aac.json",
  "generic-bounds-20261029.json",
  "api-constants-20261029.json",
  "linked-folder-20261029.json",
  "docker-verification-20261029.json",
  "persistent-index-20261030.json",
]) {
  try {
    await add(join(root, "artifacts", file));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}
const bytes = zipSync(entries, { level: 6 });
await mkdir("dist/downloads", { recursive: true });
await mkdir("artifacts", { recursive: true });
await writeFile("dist/downloads/reporecode-source.zip", bytes);
await writeFile("artifacts/RepoRecode-source.zip", bytes);
console.log(
  `Packaged ${Object.keys(entries).length} source files (${bytes.length} bytes), excluding keys, dependencies and local Git metadata.`,
);
