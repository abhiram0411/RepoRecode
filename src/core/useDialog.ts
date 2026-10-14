import { useEffect, useRef } from "react";
export function useDialog(open: boolean, onClose: () => void, locked = false) {
  const ref = useRef<HTMLElement>(null),
    close = useRef(onClose),
    disabled = useRef(locked);
  close.current = onClose;
  disabled.current = locked;
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const backgrounds = [
      ...document.querySelectorAll<HTMLElement>(
        ".sidebar,.main-shell,.companion",
      ),
    ].filter((e) => !e.contains(dialog));
    const states = backgrounds.map((e) => e.inert);
    backgrounds.forEach((e) => (e.inert = true));
    const focusable = () =>
      [
        ...dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])',
        ),
      ].filter((e) => e.getClientRects().length > 0 && !e.hidden);
    const focusFirst = () => {
      (focusable()[0] ?? dialog).focus();
    };
    focusFirst();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!disabled.current) close.current();
      }
      if (event.key !== "Tab") return;
      const items = focusable(),
        first = items[0],
        last = items.at(-1);
      if (!first) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last!.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const focus = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) focusFirst();
    };
    document.addEventListener("keydown", key, true);
    document.addEventListener("focusin", focus);
    return () => {
      document.removeEventListener("keydown", key, true);
      document.removeEventListener("focusin", focus);
      backgrounds.forEach((e, i) => (e.inert = states[i]));
      document.body.style.overflow = overflow;
      // React and the browser finish removing the dialog before restoring its opener.
      if (previous?.isConnected) requestAnimationFrame(() => {
        if (previous.isConnected && !document.querySelector('[aria-modal="true"]')) previous.focus();
      });
    };
  }, [open]);
  return ref;
}
