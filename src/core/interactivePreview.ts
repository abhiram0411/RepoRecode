import { getQuickJS } from "quickjs-emscripten";
import runtime from "../generated/interactive-runtime.js?raw";
import { previewBootstrap, sanitizePreview } from "./preview";
import type { SourceFile } from "./types";
import type { SourcePatch } from "./sourcePatch";
import { createPreviewStyleCollector } from "./previewStyles";
export type PreviewAction = {
  id: string;
  type: "click" | "change" | "input" | "submit";
  value?: string;
  checked?: boolean;
};
export type PreviewObservation = {
  sequence: number;
  event: string;
  changed: boolean;
};
export type RuntimeCall = { file: string; line: number; name: string };
export type RuntimeTrace = { calls: RuntimeCall[]; omitted: number };
export type StateRead = {
  file: string;
  line: number;
  hook: "useState" | "useReducer";
  label: string;
  value: string;
};
export type StateTrace = { reads: StateRead[]; omitted: number };
export type InteractiveSnapshot = {
  html: string;
  css: string;
  styleWarnings: string[];
  entry: string;
  exportName: string;
  observations: PreviewObservation[];
  trace: RuntimeTrace;
  state: StateTrace;
};
export async function createInteractivePreview(
  files: SourceFile[],
  entry: string,
  exportName: string,
  props: unknown = {},
  patch?: SourcePatch,
) {
  const bootstrap = previewBootstrap(
    files,
    entry,
    exportName,
    props,
    patch,
    "__rrMount",
  );
  const Q = await getQuickJS(),
    rt = Q.newRuntime();
  rt.setMemoryLimit(48 * 1024 * 1024);
  rt.setMaxStackSize(1024 * 1024);
  let deadline = 0,
    disposed = false,
    count = 0;
  rt.setInterruptHandler(() => Date.now() > deadline);
  const vm = rt.newContext();
  const styleCollector = createPreviewStyleCollector(files);
  const observations: PreviewObservation[] = [];
  function dispose() {
    if (!disposed) {
      disposed = true;
      styleCollector.dispose();
      vm.dispose();
      rt.dispose();
    }
  }
  function execute(code: string): unknown {
    if (disposed) throw Error("Preview session ended. Render again.");
    const result = vm.evalCode(code);
    if (result.error) {
      const error = vm.dump(result.error);
      result.error.dispose();
      throw Error(error.message ?? "Interactive preview failed.");
    }
    const value = vm.dump(result.value);
    result.value.dispose();
    return value;
  }
  function output(value: unknown): string {
    if (typeof value !== "string") throw Error("Renderer returned no HTML.");
    return sanitizePreview(value);
  }
  let html = "";
  let styles = { css: "", styleWarnings: [] as string[] };
  let trace: RuntimeTrace = { calls: [], omitted: 0 };
  let state: StateTrace = { reads: [], omitted: 0 };
  const sourceLines = new Map(
    files.map((file) => [file.path, file.content.split("\n").length]),
  );
  function readTrace(): RuntimeTrace {
    const raw = execute("__rrReadCalls()") as RuntimeTrace;
    if (!raw || !Array.isArray(raw.calls)) return { calls: [], omitted: 0 };
    return {
      calls: raw.calls
        .slice(0, 100)
        .filter(
          (call) =>
            call &&
            typeof call.file === "string" &&
            sourceLines.has(call.file) &&
            Number.isInteger(call.line) &&
            call.line > 0 &&
            call.line <= sourceLines.get(call.file)! &&
            typeof call.name === "string",
        )
        .map((call) => ({
          file: call.file,
          line: call.line,
          name: call.name.slice(0, 160),
        })),
      omitted:
        Number.isSafeInteger(raw.omitted) && raw.omitted >= 0 ? raw.omitted : 0,
    };
  }
  function readState(): StateTrace {
    const raw = execute("__rrReadState()") as StateTrace;
    if (!raw || !Array.isArray(raw.reads)) return { reads: [], omitted: 0 };
    return {
      reads: raw.reads
        .slice(0, 100)
        .filter(
          (read) =>
            read &&
            typeof read.file === "string" &&
            sourceLines.has(read.file) &&
            Number.isInteger(read.line) &&
            read.line > 0 &&
            read.line <= sourceLines.get(read.file)! &&
            (read.hook === "useState" || read.hook === "useReducer") &&
            typeof read.label === "string" &&
            typeof read.value === "string",
        )
        .map((read) => ({
          file: read.file,
          line: read.line,
          hook: read.hook,
          label: read.label.slice(0, 100),
          value: read.value.slice(0, 1000),
        })),
      omitted:
        Number.isSafeInteger(raw.omitted) && raw.omitted >= 0 ? raw.omitted : 0,
    };
  }
  const snapshot = (): InteractiveSnapshot => ({
    html,
    css: styles.css,
    styleWarnings: [...styles.styleWarnings],
    entry,
    exportName,
    observations: [...observations],
    trace: {
      calls: trace.calls.map((call) => ({ ...call })),
      omitted: trace.omitted,
    },
    state: {
      reads: state.reads.map((read) => ({ ...read })),
      omitted: state.omitted,
    },
  });
  try {
    deadline = Date.now() + 1500;
    execute(runtime);
    html = output(execute(bootstrap));
    styles = styleCollector.collect(execute("Array.from(__rrStylePaths)"));
    trace = readTrace();
    state = readState();
  } catch (error) {
    dispose();
    throw error;
  }
  return {
    snapshot,
    dispatch(action: PreviewAction) {
      if (
        !action ||
        typeof action.id !== "string" ||
        !/^[0-9]{1,8}$/.test(action.id) ||
        !["click", "change", "input", "submit"].includes(action.type) ||
        (action.value !== undefined &&
          (typeof action.value !== "string" || action.value.length > 2000)) ||
        (action.checked !== undefined && typeof action.checked !== "boolean")
      )
        throw Error("Invalid preview event.");
      if (++count > 200) {
        dispose();
        throw Error("200 preview interactions reached. Render again to reset.");
      }
      try {
        deadline = Date.now() + 750;
        execute("__rrResetCalls()");
        const next = output(
          execute(
            `__rrDispatch(${JSON.stringify({ id: action.id, type: action.type, value: action.value, checked: action.checked })})`,
          ),
        );
        trace = readTrace();
        state = readState();
        const nextStyles = styleCollector.collect(
          execute("Array.from(__rrStylePaths)"),
        );
        observations.push({
          sequence: count,
          event: action.type,
          changed: next !== html || nextStyles.css !== styles.css,
        });
        if (observations.length > 20) observations.shift();
        html = next;
        styles = nextStyles;
        return snapshot();
      } catch (error) {
        dispose();
        throw error;
      }
    },
    dispose,
  };
}
