import { useState } from "react";
import type { Preferences } from "../core/types";
import { cloud, syncPreferences } from "../core/cloud";
import Avatar from "./Avatar";
export default function ProfileSettings({
  prefs,
  setPrefs,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
}) {
  const [status, setStatus] = useState("");
  async function upload(f: File) {
    try {
      if (!/image\/(png|jpeg|webp)/.test(f.type) || f.size > 3 * 1024 * 1024)
        throw Error("Choose a PNG, JPEG or WebP under 3 MiB.");
      const bitmap = await createImageBitmap(f);
      try {
        if (bitmap.width > 4096 || bitmap.height > 4096)
          throw Error("Image dimensions must be 4096 pixels or smaller.");
        const c = document.createElement("canvas");
        c.width = 128;
        c.height = 128;
        const side = Math.min(bitmap.width, bitmap.height);
        c.getContext("2d")!.drawImage(
          bitmap,
          (bitmap.width - side) / 2,
          (bitmap.height - side) / 2,
          side,
          side,
          0,
          0,
          128,
          128,
        );
        setPrefs({ ...prefs, picture: c.toDataURL("image/jpeg", 0.85) });
        setStatus("Picture saved on this device.");
      } finally {
        bitmap.close();
      }
    } catch (e) {
      setStatus(String(e));
    }
  }
  return (
    <section className="settings-card profile-settings">
      <h2>Your character</h2>
      <div className="profile-preview">
        <Avatar prefs={prefs} />
      </div>
      <label>
        Hair
        <select
          value={prefs.hair ?? (prefs.tutor === "girl" ? "long" : "short")}
          onChange={(e) =>
            setPrefs({ ...prefs, hair: e.target.value as Preferences["hair"] })
          }
        >
          <option value="short">Short</option>
          <option value="long">Long</option>
          <option value="none">None</option>
        </select>
      </label>
      <label>
        Clothing
        <select
          value={prefs.outfit ?? (prefs.tutor === "girl" ? "hoodie" : "jacket")}
          onChange={(e) =>
            setPrefs({
              ...prefs,
              outfit: e.target.value as Preferences["outfit"],
            })
          }
        >
          <option value="jacket">Field jacket</option>
          <option value="hoodie">Hoodie</option>
          <option value="tee">T-shirt</option>
        </select>
      </label>
      <fieldset>
        <legend>Accessories</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={prefs.glasses ?? prefs.accessory === "glasses"}
            onChange={(e) => setPrefs({ ...prefs, glasses: e.target.checked })}
          />
          Glasses
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={prefs.cap ?? prefs.accessory === "cap"}
            onChange={(e) => setPrefs({ ...prefs, cap: e.target.checked })}
          />
          Cap
        </label>
      </fieldset>
      <label>
        Skin / robot body color
        <input
          type="color"
          value={
            prefs.skinColor ??
            (prefs.tutor === "robot"
              ? "#bccbd0"
              : prefs.tutor === "girl"
                ? "#bc8462"
                : "#dca980")
          }
          onChange={(e) => setPrefs({ ...prefs, skinColor: e.target.value })}
        />
      </label>
      {prefs.tutor !== "robot" && (
        <label>
          Hair color
          <input
            type="color"
            value={
              prefs.hairColor ??
              (prefs.tutor === "girl" ? "#422b38" : "#30343e")
            }
            onChange={(e) => setPrefs({ ...prefs, hairColor: e.target.value })}
          />
        </label>
      )}
      <label>
        Profile background
        <input
          type="color"
          value={prefs.background ?? "#26362b"}
          onChange={(e) => setPrefs({ ...prefs, background: e.target.value })}
        />
      </label>
      <label>
        Profile picture
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            if (e.target.files?.[0]) void upload(e.target.files[0]);
            e.target.value = "";
          }}
        />
      </label>
      {prefs.picture && (
        <button
          className="text-button"
          onClick={() => setPrefs({ ...prefs, picture: undefined })}
        >
          Use character instead of picture
        </button>
      )}
      <h3>Companion controls</h3>
      <label>
        Size
        <select
          value={prefs.tutorSize ?? "medium"}
          onChange={(e) =>
            setPrefs({
              ...prefs,
              tutorSize: e.target.value as Preferences["tutorSize"],
            })
          }
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </label>
      <label>
        Position
        <select
          value={prefs.tutorPosition ?? "left"}
          onChange={(e) =>
            setPrefs({
              ...prefs,
              tutorPosition: e.target.value as Preferences["tutorPosition"],
            })
          }
        >
          <option value="left">Bottom left</option>
          <option value="right">Bottom right</option>
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={!prefs.tutorHidden}
          onChange={(e) =>
            setPrefs({ ...prefs, tutorHidden: !e.target.checked })
          }
        />
        Show companion
      </label>
      {cloud && (
        <div className="button-row">
          <button
            className="secondary"
            onClick={() =>
              void syncPreferences(prefs)
                .then(() => setStatus("Preferences saved to your account."))
                .catch((e) => setStatus(String(e)))
            }
          >
            Save preferences to account
          </button>
          <button
            className="secondary"
            onClick={() =>
              void syncPreferences()
                .then((p) => {
                  setPrefs(p);
                  setStatus("Account preferences restored.");
                })
                .catch((e) => setStatus(String(e)))
            }
          >
            Restore account preferences
          </button>
        </div>
      )}
      <p className="muted">
        Original character artwork. Every outfit and accessory works with every
        preset. The Coding Pet reacts silently; explanations stay in the
        learning workspace.
      </p>
      <p role="status">{status}</p>
    </section>
  );
}
