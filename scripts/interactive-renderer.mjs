import React from "react";
import Reconciler from "react-reconciler";
import { DefaultEventPriority } from "react-reconciler/constants";
import { renderToStaticMarkup } from "react-dom/server";
import { drain } from "./preview-scheduler.mjs";

let serial = 0,
  priority = DefaultEventPriority,
  failure;
const microtasks = [],
  container = { children: [] },
  context = {};
const noop = () => {};
const remove = (parent, child) => {
  const i = parent.children.indexOf(child);
  if (i >= 0) {
    parent.children.splice(i, 1);
    child.parent = undefined;
  }
};
const append = (parent, child) => {
  if (child.parent) remove(child.parent, child);
  parent.children.push(child);
  child.parent = parent;
};
const insert = (parent, child, before) => {
  if (child.parent) remove(child.parent, child);
  const i = parent.children.indexOf(before);
  if (i < 0) throw Error("Invalid preview insertion.");
  parent.children.splice(i, 0, child);
  child.parent = parent;
};
const renderer = Reconciler({
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: true,
  supportsMicrotasks: true,
  getRootHostContext: () => context,
  getChildHostContext: () => context,
  getPublicInstance: () => null,
  createInstance: (type, props) => ({
    id: String(++serial),
    type,
    props,
    children: [],
  }),
  createTextInstance: (text) => ({ text }),
  appendInitialChild: append,
  appendChild: append,
  appendChildToContainer: append,
  insertBefore: insert,
  insertInContainerBefore: insert,
  removeChild: remove,
  removeChildFromContainer: remove,
  clearContainer: (node) => {
    node.children = [];
  },
  shouldSetTextContent: () => false,
  finalizeInitialChildren: () => false,
  prepareForCommit: () => null,
  resetAfterCommit: noop,
  commitUpdate: (node, type, oldProps, props) => {
    node.props = props;
  },
  commitTextUpdate: (node, old, text) => {
    node.text = text;
  },
  resetTextContent: (node) => {
    node.children = [];
  },
  hideInstance: (node) => {
    node.hidden = true;
  },
  unhideInstance: (node) => {
    node.hidden = false;
  },
  hideTextInstance: (node) => {
    node.hidden = true;
  },
  unhideTextInstance: (node) => {
    node.hidden = false;
  },
  detachDeletedInstance: noop,
  scheduleMicrotask: (callback) => microtasks.push(callback),
  scheduleTimeout: () => {
    throw Error("Timers and delayed suspense are unsupported.");
  },
  cancelTimeout: noop,
  noTimeout: -1,
  getCurrentUpdatePriority: () => priority,
  setCurrentUpdatePriority: (value) => {
    priority = value;
  },
  resolveUpdatePriority: () => priority || DefaultEventPriority,
  shouldAttemptEagerTransition: () => false,
  NotPendingTransition: null,
  HostTransitionContext: React.createContext(null),
  maySuspendCommit: () => false,
  maySuspendCommitOnUpdate: () => false,
  maySuspendCommitInSyncRender: () => false,
  preloadInstance: () => true,
  startSuspendingCommit: noop,
  suspendInstance: noop,
  waitForCommitToBeReady: () => null,
  getSuspendedCommitReason: () => null,
  resetFormInstance: noop,
  bindToConsole: (method, args) => () => {
    throw Error(String(args[0]));
  },
});
const fail = (error) => {
  failure = error;
};
const root = renderer.createContainer(
  container,
  1,
  null,
  false,
  null,
  "rr",
  fail,
  fail,
  fail,
  noop,
);
function flush() {
  for (let i = 0; i < 25; i++) {
    renderer.flushSyncWork();
    const effects = renderer.flushPassiveEffects();
    let microtaskCount = 0;
    while (microtasks.length) {
      if (++microtaskCount > 100) throw Error("Too many preview microtasks.");
      microtasks.shift()();
    }
    drain();
    if (failure) throw failure;
    if (!effects && !microtasks.length) return;
  }
  throw Error("Preview effects did not settle.");
}
const eventNames = {
  click: "onClick",
  change: "onChange",
  input: "onInput",
  submit: "onSubmit",
};
let calls = [],
  omittedCalls = 0,
  stateReads = [],
  omittedStateReads = 0;
// Never call getters or toJSON while inspecting a state value. All inspection
// stays inside the VM and its existing memory/time limits, including Proxy traps.
function describeState(value) {
  const seen = new WeakSet();
  let remaining = 40;
  function safe(v, depth) {
    if (--remaining < 0) return "[value limit]";
    if (v === null || typeof v === "boolean") return v;
    if (typeof v === "string")
      return v.length > 200 ? v.slice(0, 200) + "…" : v;
    if (typeof v === "number") return Number.isFinite(v) ? v : String(v);
    if (typeof v !== "object") return `[${typeof v}]`;
    if (seen.has(v)) return "[circular]";
    if (depth >= 2) return Array.isArray(v) ? "[array]" : "[object]";
    seen.add(v);
    const out = Object.create(null);
    let count = 0;
    for (const key of Object.keys(v)) {
      if (count++ >= 8) {
        out["…"] = "[more fields]";
        break;
      }
      const d = Object.getOwnPropertyDescriptor(v, key);
      out[key.slice(0, 100)] =
        d && "value" in d ? safe(d.value, depth + 1) : "[accessor]";
    }
    return out;
  }
  try {
    return JSON.stringify(safe(value, 0)).slice(0, 1000);
  } catch {
    return "[unavailable]";
  }
}
Object.defineProperty(globalThis, "__rrRecordState", {
  value: (file, line, hook, label, pair) => {
    if (stateReads.length < 100)
      stateReads.push({
        file,
        line,
        hook,
        label,
        value: describeState(pair[0]),
      });
    else omittedStateReads++;
    return pair;
  },
  writable: false,
  configurable: false,
});
globalThis.__rrReadState = () => ({
  reads: stateReads,
  omitted: omittedStateReads,
});
Object.defineProperty(globalThis, "__rrRecordCall", {
  value: (file, line, name) => {
    if (calls.length < 100) calls.push({ file, line, name });
    else omittedCalls++;
  },
  writable: false,
  configurable: false,
});
globalThis.__rrReadCalls = () => ({ calls, omitted: omittedCalls });
globalThis.__rrResetCalls = () => {
  calls = [];
  omittedCalls = 0;
  stateReads = [];
  omittedStateReads = 0;
};
let liveNodes = new Map();
function snapshot() {
  liveNodes = new Map();
  let count = 0;
  function element(node) {
    if (++count > 5000) throw Error("Preview contains too many elements.");
    if (node.hidden) return null;
    if ("text" in node) return node.text;
    liveNodes.set(node.id, node);
    const props = {};
    for (const [key, value] of Object.entries(node.props)) {
      if (
        key === "children" ||
        key === "ref" ||
        key === "dangerouslySetInnerHTML" ||
        /^on/i.test(key) ||
        key.startsWith("data-rr-node") ||
        key.startsWith("data-rr-events")
      )
        continue;
      if (typeof value !== "function" && typeof value !== "symbol")
        props[key] = value;
    }
    props["data-rr-node"] = node.id;
    props["data-rr-events"] = Object.entries(eventNames)
      .filter(([, prop]) => typeof node.props[prop] === "function")
      .map(([event]) => event)
      .join(" ");
    if (
      node.type === "input" &&
      props.value === undefined &&
      props.defaultValue !== undefined
    )
      props.value = props.defaultValue;
    return React.createElement(node.type, props, ...node.children.map(element));
  }
  const html = renderToStaticMarkup(
    React.createElement(
      React.Fragment,
      null,
      ...container.children.map(element),
    ),
  );
  if (html.length > 512000) throw Error("Rendered output exceeds 500 KiB.");
  return html;
}
globalThis.__rrReact = React;
globalThis.__rrMount = (component) => {
  renderer.updateContainerSync(component, root, null, noop);
  flush();
  return snapshot();
};
globalThis.__rrDispatch = (action) => {
  const target = liveNodes.get(action.id),
    prop = eventNames[action.type];
  if (!target || !prop)
    throw Error("Unknown preview event target. Render again.");
  if (target.props.disabled) throw Error("This preview control is disabled.");
  let stopped = false;
  const event = {
    type: action.type,
    target: { value: action.value ?? "", checked: !!action.checked },
    currentTarget: null,
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      stopped = true;
    },
  };
  renderer.flushSyncFromReconciler(() => {
    // React's onChange runs on each text input; expose only plain value/checked data.
    for (const eventProp of action.type === "input"
      ? ["onInput", "onChange"]
      : [prop]) {
      stopped = false;
      for (
        let node = target;
        node && node !== container && !stopped;
        node = node.parent
      ) {
        const handler = node.props[eventProp];
        event.currentTarget = {
          value:
            node === target
              ? event.target.value
              : String(node.props.value ?? ""),
          checked:
            node === target ? event.target.checked : !!node.props.checked,
        };
        if (typeof handler === "function") {
          const result = handler(event);
          if (result && typeof result.then === "function")
            throw Error("Async event handlers are unsupported.");
        }
      }
    }
    if (action.type === "click" && !event.defaultPrevented) {
      let control = target;
      while (
        control &&
        control !== container &&
        !["button", "input"].includes(control.type)
      )
        control = control.parent;
      if (
        control &&
        !control.props.disabled &&
        ((control.type === "button" &&
          (!control.props.type || control.props.type === "submit")) ||
          (control.type === "input" && control.props.type === "submit"))
      ) {
        let form = control.parent;
        while (form && form !== container && form.type !== "form")
          form = form.parent;
        if (form && form !== container) {
          event.type = "submit";
          event.target = { value: "", checked: false };
          stopped = false;
          for (
            let node = form;
            node && node !== container && !stopped;
            node = node.parent
          ) {
            event.currentTarget = { value: "", checked: false };
            if (typeof node.props.onSubmit === "function") {
              const result = node.props.onSubmit(event);
              if (result && typeof result.then === "function")
                throw Error("Async event handlers are unsupported.");
            }
          }
        }
      }
    }
  });
  flush();
  return snapshot();
};
