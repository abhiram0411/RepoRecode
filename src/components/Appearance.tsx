import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { palettes } from "../core/themes";
import type { Preferences } from "../core/types";
import { useWorkspaceTheme } from "../core/useWorkspaceTheme";
export default function Appearance({
  prefs,
  setPrefs,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
}) {
  const activeTheme = useWorkspaceTheme(prefs.theme, prefs.followDeviceTheme);
  return (
    <section className="settings-card appearance-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">MAKE SPACE FOR FOCUS</p>
          <h2>Appearance</h2>
        </div>
        <button
          className="text-button"
          onClick={() =>
            setPrefs({ ...prefs, theme: "dark", followDeviceTheme: false })
          }
        >
          Reset theme
        </button>
      </div>
      <p className="muted">
        A complete palette for your workspace, source editor and flow graph.
        Your imported app keeps its own colors.
      </p>
      <label className="check">
        <input
          type="checkbox"
          checked={!!prefs.followDeviceTheme}
          onChange={(e) =>
            setPrefs({ ...prefs, followDeviceTheme: e.target.checked })
          }
        />
        Follow device light/dark setting
      </label>
      <p className="muted">
        Uses Fieldwork in dark mode and Fieldwork Paper in light mode. Choosing
        a palette switches back to your own selection.
      </p>
      <div className="theme-grid" role="group" aria-label="Workspace palettes">
        {palettes.map((p) => (
          <button
            key={p.id}
            className="theme-choice"
            aria-pressed={activeTheme === p.id}
            onClick={() =>
              setPrefs({ ...prefs, theme: p.id, followDeviceTheme: false })
            }
            style={
              {
                "--swatch-bg": p.colors.bg,
                "--swatch-panel": p.colors.panel2,
                "--swatch-accent": p.colors.accent,
                "--swatch-text": p.colors.text,
              } as CSSProperties
            }
          >
            <span className="theme-mini" aria-hidden="true">
              <i />
              <span>
                <b />
                <b />
                <b />
              </span>
              <em />
            </span>
            <span>
              {p.name}
              {activeTheme === p.id && <Check size={14} />}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
