import { useSyncExternalStore } from "react";
import type { ThemeId } from "./themes";
const query = "(prefers-color-scheme: dark)";
function subscribe(changed: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener("change", changed);
  return () => media.removeEventListener("change", changed);
}
const read = () => window.matchMedia(query).matches;
const serverSnapshot = () => true;
export function useWorkspaceTheme(
  theme: ThemeId,
  followDevice = false,
): ThemeId {
  const dark = useSyncExternalStore(subscribe, read, serverSnapshot);
  return followDevice ? (dark ? "dark" : "light") : theme;
}
