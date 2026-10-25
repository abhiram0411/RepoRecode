import { useEffect, useState } from "react";
import { accountDeletionAvailable } from "./accountService";

export function useAccountDeletion(active: boolean) {
  const [available, setAvailable] = useState(false);
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setAvailable(false);
    if (!active) return;
    let disposed = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setChecking(true);
    void accountDeletionAvailable(controller.signal)
      .then((enabled) => {
        if (!disposed) setAvailable(enabled);
      })
      .catch(() => {
        if (!disposed) setAvailable(false);
      })
      .finally(() => {
        clearTimeout(timeout);
        if (!disposed) setChecking(false);
      });
    return () => {
      disposed = true;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [active, attempt]);
  return {
    available: active && available,
    checking,
    retry: () => setAttempt((n) => n + 1),
  };
}
