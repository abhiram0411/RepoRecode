import { useEffect, useState } from "react";
import { cloudConfig } from "./cloudConfig";
import {
  fetchAuthAvailability,
  type AuthAvailability,
} from "./authAvailability";

const config = cloudConfig(import.meta.env);
export function useAuthAvailability(active: boolean) {
  const [settings, setSettings] = useState<AuthAvailability | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!active || !config) return;
    const controller = new AbortController();
    let disposed = false;
    setSettings(null);
    setError("");
    const timeout = setTimeout(() => controller.abort(), 8000);
    void fetchAuthAvailability(config, controller.signal)
      .then((next) => {
        if (!disposed) setSettings(next);
      })
      .catch(() => {
        if (!disposed)
          setError(
            "Sign-in methods are temporarily unavailable. Your local workspace still works.",
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [active, attempt]);
  return { settings, error, retry: () => setAttempt((n) => n + 1) };
}
