import { useEffect, useRef, useState } from "react";
import {
  folderChanges,
  readLinkedFolder,
  type FolderHandle,
} from "../core/linkedFolder";
import type { SourceFile } from "../core/types";

export default function LinkedFolder({
  onImport,
  disabled,
}: {
  onImport: (
    files: SourceFile[],
    name: string,
    origin: string,
  ) => Promise<void>;
  disabled: boolean;
}) {
  const picker = (
    window as Window & {
      showDirectoryPicker?: (options: {
        mode: "read";
      }) => Promise<FolderHandle>;
    }
  ).showDirectoryPicker;
  const [handle, setHandle] = useState<FolderHandle>();
  const [pending, setPending] = useState<SourceFile[]>();
  const [watch, setWatch] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const baseline = useRef<SourceFile[] | undefined>(undefined);
  const active = useRef<AbortController | undefined>(undefined);
  const running = useRef(false);
  const generation = useRef(0);
  const current = useRef({ onImport, disabled });
  current.current = { onImport, disabled };
  useEffect(
    () => () => {
      generation.current++;
      active.current?.abort();
    },
    [],
  );
  async function scan(selected: FolderHandle, token: number) {
    const controller = new AbortController();
    active.current = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(Error("Folder read timed out. Try a smaller source folder."));
      }, 10000);
    });
    try {
      const files = await Promise.race([
        readLinkedFolder(selected, controller.signal),
        deadline,
      ]);
      if (token !== generation.current) return;
      const diff = baseline.current && folderChanges(baseline.current, files);
      const changes = !diff || diff.added + diff.changed + diff.removed > 0;
      setPending(changes ? files : undefined);
      setMessage(
        diff
          ? changes
            ? `${diff.added} added, ${diff.changed} changed, ${diff.removed} removed source files.`
            : "No source changes found."
          : `${files.length} source files ready to import.`,
      );
      return files;
    } finally {
      clearTimeout(timer);
    }
  }
  async function check() {
    if (!handle || running.current || current.current.disabled) return;
    running.current = true;
    setBusy(true);
    const token = generation.current;
    try {
      await scan(handle, token);
    } catch (error) {
      if (token === generation.current) {
        setWatch(false);
        setPending(undefined);
        setMessage(
          `Folder check stopped: ${error instanceof Error ? error.message : String(error)}. Relink the folder to retry.`,
        );
      }
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  const checkRef = useRef(check);
  checkRef.current = check;
  useEffect(() => {
    if (!watch || !handle) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") void checkRef.current();
    }, 15000);
    return () => clearInterval(timer);
  }, [watch, handle]);
  if (!picker) return null;
  return (
    <section className="linked-folder" aria-label="Linked local folder">
      <details>
        <summary>
          Linked local folder{handle ? ` · ${handle.name}` : ""}
        </summary>
        <p>
          Read source changes from a folder you choose. Importing a changed
          snapshot keeps your earlier project and progress. The link lasts until
          you reload this page.
        </p>
        <div className="button-row">
          <button
            className="secondary"
            disabled={busy || disabled}
            onClick={() => {
              if (running.current) return;
              running.current = true;
              setBusy(true);
              const token = ++generation.current;
              void (async () => {
                try {
                  const selected = await picker.call(window, { mode: "read" });
                  if (token !== generation.current) return;
                  baseline.current = undefined;
                  setPending(undefined);
                  setWatch(false);
                  setHandle(selected);
                  await scan(selected, token);
                } catch (error) {
                  if (
                    token === generation.current &&
                    !(
                      error instanceof DOMException &&
                      error.name === "AbortError"
                    )
                  )
                    setMessage(
                      `Could not link folder: ${error instanceof Error ? error.message : String(error)}`,
                    );
                } finally {
                  running.current = false;
                  setBusy(false);
                }
              })();
            }}
          >
            {handle ? "Relink folder" : "Link a local folder"}
          </button>
          {handle && (
            <>
              <button
                className="secondary"
                disabled={busy || disabled}
                onClick={() => void check()}
              >
                Check folder changes
              </button>
              <button
                className="secondary"
                disabled={busy || disabled || !pending}
                onClick={() => {
                  running.current = true;
                  setBusy(true);
                  const token = generation.current;
                  void (async () => {
                    try {
                      const files = await scan(handle, token);
                      if (!files || token !== generation.current) return;
                      if (current.current.disabled)
                        throw Error(
                          "Another project operation is running. Try again when it finishes.",
                        );
                      await current.current.onImport(
                        files,
                        handle.name,
                        "Linked local folder",
                      );
                      if (token === generation.current) {
                        baseline.current = files;
                        setPending(undefined);
                        setMessage(
                          "Folder snapshot imported. Your original files were not changed.",
                        );
                      }
                    } catch (error) {
                      if (token === generation.current)
                        setMessage(
                          `Import failed: ${error instanceof Error ? error.message : String(error)}`,
                        );
                    } finally {
                      running.current = false;
                      setBusy(false);
                    }
                  })();
                }}
              >
                {baseline.current ? "Import changes" : "Import linked folder"}
              </button>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => {
                  generation.current++;
                  active.current?.abort();
                  setHandle(undefined);
                  setWatch(false);
                  setPending(undefined);
                  baseline.current = undefined;
                  setMessage("Folder disconnected. Saved projects remain.");
                }}
              >
                Disconnect folder
              </button>
            </>
          )}
        </div>
        {handle && (
          <label>
            <input
              type="checkbox"
              checked={watch}
              onChange={(event) => setWatch(event.target.checked)}
            />{" "}
            Check for changes every 15 seconds while this tab is visible
          </label>
        )}
        <p role="status">{busy ? "Reading source…" : message}</p>
        <p className="muted">
          Read-only access. Hidden folders and dependency/build output are
          skipped. Changes are imported only when you press the import button.
        </p>
      </details>
    </section>
  );
}
