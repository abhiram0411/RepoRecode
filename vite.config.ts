import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { cloudConfig } from "./src/core/cloudConfig";
export default defineConfig(({ mode }) => {
  cloudConfig(loadEnv(mode, process.cwd(), "VITE_"));
  return {
    plugins: [react()],
    worker: { format: "es" },
    // QuickJS locates its WASM beside import.meta.url. Dependency prebundling
    // relocates that module without its binary and serves the SPA fallback instead.
    optimizeDeps: {
      // Worker-only parsers must be ready before the first preview; discovering
      // them lazily otherwise triggers a full-page optimizer reload mid-session.
      include: ["typescript", "parse5", "css-tree"],
      exclude: [
        "quickjs-emscripten",
        "@jitl/quickjs-wasmfile-release-sync",
        "@jitl/quickjs-wasmfile-release-asyncify",
        "@jitl/quickjs-wasmfile-debug-sync",
        "@jitl/quickjs-wasmfile-debug-asyncify",
      ],
    },
    build: { target: "es2022" },
    server: { proxy: { "/api": "http://127.0.0.1:8788" } },
  };
});
