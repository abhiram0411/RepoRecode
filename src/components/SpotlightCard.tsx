import { useEffect, useRef, type PointerEvent, type ReactNode } from "react";

/** Reduced, event-driven adaptation of React Bits SpotlightCard.
 * Copyright (c) 2026 David Haz. See docs/licenses/react-bits.md.
 * No document listeners, animation loop, ambient movement or external assets.
 */
export default function SpotlightCard({
  children,
  enabled,
}: {
  children: ReactNode;
  enabled: boolean;
}) {
  const surface = useRef<HTMLElement>(null);
  function clear() {
    surface.current?.style.removeProperty("--spotlight-x");
    surface.current?.style.removeProperty("--spotlight-y");
    surface.current?.removeAttribute("data-spotlight-active");
  }
  useEffect(() => {
    if (!enabled) clear();
  }, [enabled]);
  function move(event: PointerEvent<HTMLElement>) {
    if (!enabled || event.pointerType !== "mouse") return;
    const root = event.currentTarget;
    const bounds = root.getBoundingClientRect();
    root.style.setProperty("--spotlight-x", `${event.clientX - bounds.left}px`);
    root.style.setProperty("--spotlight-y", `${event.clientY - bounds.top}px`);
    root.setAttribute("data-spotlight-active", "true");
  }
  return (
    <article
      ref={surface}
      className="project-card spotlight-card"
      data-spotlight-enabled={enabled}
      onPointerMove={move}
      onPointerLeave={clear}
      onPointerCancel={clear}
    >
      {children}
    </article>
  );
}
