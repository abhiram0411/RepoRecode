import { build } from "esbuild";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { mkdir } from "node:fs/promises";
const require = createRequire(import.meta.url);
const legacy = join(
  dirname(require.resolve("react-dom/package.json")),
  "cjs/react-dom-server-legacy.browser.production.js",
);
await mkdir("src/generated", { recursive: true });
await build({
  stdin: {
    contents: `import React from 'react'; import {renderToString} from ${JSON.stringify(legacy)}; globalThis.__rrReact=React;globalThis.__rrRender=renderToString;`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  define: { "process.env.NODE_ENV": '"production"' },
  minify: true,
  legalComments: "inline",
  outfile: "src/generated/react-runtime.js",
});
await build({
  entryPoints: ['scripts/interactive-renderer.mjs'],
  bundle: true, platform: 'browser', format: 'iife',
  alias: { scheduler: join(process.cwd(), 'scripts/preview-scheduler.mjs'), 'react-dom/server': legacy },
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: true, legalComments: 'inline',
  outfile: 'src/generated/interactive-runtime.js',
});
