import Editor, { loader } from "@monaco-editor/react";
import { useEffect, useId } from "react";
import { palettes, type ThemeId } from "../core/themes";
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
self.MonacoEnvironment = {
  getWorker: (_id, label) =>
    label === "typescript" || label === "javascript"
      ? new TsWorker()
      : new EditorWorker(),
};
loader.config({ monaco });
monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
  jsx: monaco.languages.typescript.JsxEmit.Preserve,
});
for (const p of palettes)
  monaco.editor.defineTheme(`reporecode-${p.id}`, {
    base: p.light ? "vs" : "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: p.colors.keyword.slice(1) },
      { token: "string", foreground: p.colors.string.slice(1) },
      { token: "number", foreground: p.colors.number.slice(1) },
      { token: "comment", foreground: p.colors.muted.slice(1) },
    ],
    colors: {
      "editor.background": p.colors.code,
      "editor.foreground": p.colors.text,
      "editorLineNumber.foreground": p.colors.muted,
      "editorLineNumber.activeForeground": p.colors.accent,
      "editor.selectionBackground": p.colors.selection,
      "editor.lineHighlightBackground": p.colors.panel2,
      "editorCursor.foreground": p.colors.accent,
      "editorGutter.background": p.colors.code,
      "editorWidget.background": p.colors.panel,
      "editorWidget.border": p.colors.line,
      "editorError.foreground": p.colors.danger,
      "editorWarning.foreground": p.colors.warning,
      focusBorder: p.colors.focus,
    },
  });
export default function CodeEditor({
  value,
  onChange,
  readOnly,
  theme = "dark",
  jsx = false,
  typeContext,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  theme?: ThemeId;
  jsx?: boolean;
  typeContext?: string;
}) {
  const contextId = useId();
  useEffect(() => {
    if (!typeContext) return;
    const library = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      typeContext,
      `inmemory://reporecode/contracts/${encodeURIComponent(contextId)}.d.ts`,
    );
    return () => library.dispose();
  }, [typeContext, contextId]);
  return (
    <Editor
      height="360px"
      language="typescript"
      path={
        jsx
          ? `inmemory://reporecode/${readOnly ? "source" : "practice"}.tsx`
          : undefined
      }
      theme={`reporecode-${theme}`}
      value={value}
      onChange={(v) => onChange?.(v ?? "")}
      options={{
        readOnly,
        ariaLabel: readOnly ? "Source code (read only)" : "Practice code",
        fontSize: 13,
        fontFamily: "Consolas, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 18 },
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        accessibilitySupport: "on",
      }}
      loading={<p>Loading source editor…</p>}
    />
  );
}
