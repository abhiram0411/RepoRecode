// Trusted UI adapter only. Imported project code never executes in this frame.
// This file is loaded as a classic external script in an opaque-origin sandbox.
(() => {
  const script = document.currentScript;
  const initial = JSON.parse(script.dataset.config);
  let config = initial;
  const send = (message) =>
    parent.postMessage(
      { channel: "reporecode-preview", token: initial.token, ...message },
      initial.parentOrigin,
    );
  const highlight = () => {
    for (const el of document.querySelectorAll("[data-rr-file]")) {
      const line = Number(el.getAttribute("data-rr-line"));
      el.style.outline =
        el.getAttribute("data-rr-file") === config.selected.file &&
        line >= config.selected.line &&
        line <= config.selected.endLine
          ? "2px solid #718c46"
          : "";
    }
  };
  addEventListener("message", (event) => {
    if (
      event.source !== parent ||
      event.origin !== initial.parentOrigin ||
      event.data?.channel !== "reporecode-preview-config" ||
      event.data?.token !== initial.token
    )
      return;
    config = { ...config, ...event.data.config };
    highlight();
  });
  function forward(event, type, override) {
    if (config.inspect || !config.active) return;
    const target = override ?? event.target;
    if (!(target instanceof Element)) return;
    const marker =
      type === "input"
        ? '[data-rr-events~="input"], [data-rr-events~="change"]'
        : `[data-rr-events~="${type}"]`;
    const submitter = target.closest("button, input");
    const submits =
      type === "click" &&
      submitter?.type === "submit" &&
      submitter.closest('form[data-rr-events~="submit"]');
    if (!target.closest(marker) && !submits) return;
    const el = target.closest("[data-rr-node]");
    if (!el || el.disabled) return;
    const focus = ["INPUT", "TEXTAREA"].includes(el.tagName)
      ? {
          id: el.dataset.rrNode,
          start: el.selectionStart,
          end: el.selectionEnd,
        }
      : null;
    send({
      kind: "action",
      action: {
        id: el.dataset.rrNode,
        type,
        value: typeof el.value === "string" ? el.value.slice(0, 2000) : "",
        checked: !!el.checked,
      },
      focus,
    });
  }
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const control = event.target.closest("button, input");
    if (
      config.inspect ||
      !config.active ||
      control?.type === "submit" ||
      event.target.closest("a")
    )
      event.preventDefault();
    if (!config.inspect) {
      forward(event, "click");
      return;
    }
    const el = event.target.closest("[data-rr-file]");
    if (el)
      send({
        kind: "select",
        file: el.getAttribute("data-rr-file"),
        line: Number(el.getAttribute("data-rr-line")),
      });
  });
  document.addEventListener("input", (event) => {
    const target = event.target;
    if (
      (target.tagName === "INPUT" &&
        !["checkbox", "radio"].includes(target.type)) ||
      target.tagName === "TEXTAREA"
    )
      forward(event, "input");
  });
  document.addEventListener("change", (event) => {
    const target = event.target;
    if (
      target.tagName === "SELECT" ||
      ["checkbox", "radio"].includes(target.type)
    )
      forward(event, "change");
  });
  document.addEventListener("submit", (event) => {
    event.preventDefault();
    forward(event, "submit");
  });
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    if (
      event.key === "Enter" &&
      target.tagName === "INPUT" &&
      !["checkbox", "radio", "button", "submit"].includes(target.type)
    ) {
      const form = target.closest("form");
      if (form) {
        event.preventDefault();
        forward(event, "submit", form);
      }
    }
  });
  highlight();
  if (initial.focus) {
    // Compare attributes rather than interpolating a source-provided selector.
    const el = [...document.querySelectorAll("[data-rr-node]")].find(
      (node) => node.getAttribute("data-rr-node") === initial.focus.id,
    );
    el?.focus();
    if (el && initial.focus.start !== null) {
      try {
        el.setSelectionRange(initial.focus.start, initial.focus.end);
      } catch {
        /* Non-text controls have no caret. */
      }
    }
  }
  send({ kind: "ready" });
})();
