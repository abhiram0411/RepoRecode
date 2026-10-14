import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { EyeOff, Sparkles, X } from "lucide-react";
import type { Preferences } from "../core/types";
import { petCaptions, type PetEvent, type PetState } from "../core/pet";
import Avatar from "./Avatar";

export default function Companion({
  prefs,
  setPrefs,
  event,
  practicing,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  event: PetEvent;
  practicing: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reaction, setReaction] = useState<{ state: PetState; serial: number }>(
    { state: "idle", serial: 0 },
  );
  const lastEvent = useRef(event.id);
  const reduced = useReducedMotion();
  const animate = prefs.motion && prefs.visual && !reduced;
  const rest = practicing ? "watching" : "idle";
  useEffect(() => {
    if (lastEvent.current === event.id) return;
    lastEvent.current = event.id;
    if (!prefs.tutorHidden)
      setReaction({ state: event.state, serial: event.id });
  }, [event, prefs.tutorHidden]);
  useEffect(() => {
    if (reaction.state === "idle") return;
    const timer = setTimeout(
      () => setReaction((r) => ({ ...r, state: "idle" })),
      2600,
    );
    return () => clearTimeout(timer);
  }, [reaction.serial, reaction.state]);
  useEffect(() => {
    if (prefs.tutorHidden) {
      setOpen(false);
      setReaction({ state: "idle", serial: 0 });
    }
  }, [prefs.tutorHidden]);
  if (prefs.tutorHidden) return null;
  const state = reaction.state === "idle" ? rest : reaction.state;
  const name = { robot: "Echo", boy: "Kai", girl: "Mira" }[prefs.tutor];
  const joyful = state === "celebrating" || state === "achievement";
  return (
    <div
      className={`companion coding-pet ${animate ? "" : "still"}`}
      data-state={state}
      data-size={prefs.tutorSize ?? "medium"}
      data-position={prefs.tutorPosition ?? "left"}
    >
      <AnimatePresence>
        {open && (
          <motion.section
            className="tutor-panel pet-panel"
            aria-label="Coding Pet"
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: animate ? 0.18 : 0 }}
          >
            <header>
              <b>
                {name} <span className="muted">/ Coding Pet</span>
              </b>
              <button aria-label="Minimize pet" onClick={() => setOpen(false)}>
                <X size={16} />
              </button>
            </header>
            <p aria-live="polite">{petCaptions[state]}</p>
            <p className="muted">A little company while you practice.</p>
            <button
              className="text-button"
              onClick={() => setPrefs({ ...prefs, tutorHidden: true })}
            >
              <EyeOff size={14} /> Hide pet
            </button>
          </motion.section>
        )}
      </AnimatePresence>
      <motion.button
        className="tutor-launch pet-launch"
        aria-label={`Greet ${name}, Coding Pet`}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setReaction({ state: "greeting", serial: Date.now() });
        }}
        animate={
          animate && joyful
            ? { y: [0, -10, 0, -5, 0], rotate: [0, -3, 3, 0] }
            : animate && state === "frustrated"
              ? { x: [0, -3, 3, 0], y: 0, rotate: 0 }
              : { x: 0, y: 0, rotate: 0 }
        }
        transition={{ duration: animate ? 0.55 : 0 }}
        whileHover={animate ? { scale: 1.03 } : undefined}
        whileTap={animate ? { scale: 0.97 } : undefined}
      >
        <Avatar
          prefs={prefs}
          companion
          happy={joyful || state === "greeting"}
        />
        <span>
          {name} {joyful && <Sparkles size={12} />}
        </span>
      </motion.button>
      <span className="sr-only" role="status">
        {joyful || state === "frustrated" ? petCaptions[state] : ""}
      </span>
    </div>
  );
}
