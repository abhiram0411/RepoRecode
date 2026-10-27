import bridgeUrl from "./previewBridge.js?url&no-inline";
import type { PreviewAction } from "./interactivePreview";

export type PreviewFocus = {
  id: string;
  start: number | null;
  end: number | null;
} | null;
export type PreviewFrameConfig = {
  inspect: boolean;
  active: boolean;
  selected: { file: string; line: number; endLine: number };
  focus: PreviewFocus;
};
type FrameMessage =
  | { kind: "ready" }
  | { kind: "select"; file: string; line: number }
  | { kind: "action"; action: PreviewAction; focus: PreviewFocus };
const record = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function previewMessage(
  event: MessageEvent,
  source: Window | null,
  token: string,
): FrameMessage | null {
  const data: unknown = event.data;
  if (
    !source ||
    event.source !== source ||
    event.origin !== "null" ||
    !record(data) ||
    data.channel !== "reporecode-preview" ||
    data.token !== token
  )
    return null;
  if (data.kind === "ready") return { kind: "ready" };
  if (
    data.kind === "select" &&
    typeof data.file === "string" &&
    data.file.length <= 4096 &&
    Number.isSafeInteger(data.line) &&
    data.line > 0
  )
    return { kind: "select", file: data.file, line: data.line };
  const a = data.action;
  if (
    data.kind !== "action" ||
    !record(a) ||
    typeof a.id !== "string" ||
    a.id.length > 200 ||
    !["click", "input", "change", "submit"].includes(a.type) ||
    typeof a.value !== "string" ||
    a.value.length > 2000 ||
    typeof a.checked !== "boolean"
  )
    return null;
  const f = data.focus;
  const offset = (v: unknown) =>
    v === null ||
    (Number.isSafeInteger(v) && Number(v) >= 0 && Number(v) <= 2000);
  if (
    f !== null &&
    (!record(f) || f.id !== a.id || !offset(f.start) || !offset(f.end))
  )
    return null;
  return {
    kind: "action",
    action: { id: a.id, type: a.type, value: a.value, checked: a.checked },
    focus: f,
  };
}
function attribute(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
// html/css arrive only from the worker's allowlist sanitizer. Source text never
// becomes a script: the sole permitted script is our external, nonced adapter.
export function previewDocument(
  html: string,
  css: string,
  token: string,
  config: PreviewFrameConfig,
  origin: string,
) {
  const url = new URL(bridgeUrl, origin).href;
  const data = attribute(
    JSON.stringify({ ...config, token, parentOrigin: origin }),
  );
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${token}'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{font:14px system-ui;margin:20px;color:#172014;background:white}button,input{font:inherit}*{box-sizing:border-box}</style><style>${css.replace(/</g, "\\3c ")}</style><script nonce="${token}" src="${attribute(url)}" data-config="${data}" defer></script></head><body>${html}</body></html>`;
}
