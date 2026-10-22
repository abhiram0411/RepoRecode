import { openDB } from "idb";
import type { Project, Preferences, Analysis, Lesson } from "./types";
import { ANALYSIS_VERSION } from "./analysisVersion";
import { validatePreferences } from "./preferences";
import type { RestorePlan } from "./restorePlan";
const db = openDB("reporecode", 1, {
  upgrade(d) {
    d.createObjectStore("projects", { keyPath: "id" });
    d.createObjectStore("settings");
  },
});
export const listProjects = async () =>
  (await (await db).getAll("projects")) as Project[];
export const saveProject = async (p: Project) => {
  if (new TextEncoder().encode(JSON.stringify(p)).byteLength > 6 * 1024 * 1024)
    throw Error(
      "Project and learning data exceed the 6 MiB storage limit. Export and import a smaller source folder.",
    );
  const database = await db;
  if (
    !(await database.get("projects", p.id)) &&
    (await database.count("projects")) >= 25
  )
    throw Error(
      "This workspace holds 25 projects. Export and remove an old project before importing another.",
    );
  await (await db).put("projects", p);
};
export const deleteProject = async (id: string) => {
  await (await db).delete("projects", id);
};
export async function saveAnalysisUpdate(
  snapshot: Project,
  analysis: Analysis,
  lessons: Lesson[],
): Promise<Project> {
  const database = await db;
  const tx = database.transaction("projects", "readwrite");
  try {
    const current = (await tx.store.get(snapshot.id)) as Project | undefined;
    if (
      !current ||
      JSON.stringify(current.files) !== JSON.stringify(snapshot.files)
    )
      throw Error(
        "This project was removed or its source changed. Nothing was refreshed; reopen the project and try again.",
      );
    // Read learning fields inside this transaction so edits made during worker
    // analysis survive. Refresh only derived data, never restore an old draft.
    const updated: Project = {
      ...current,
      analysis,
      lessons,
      analysisVersion: ANALYSIS_VERSION,
    };
    if (
      new TextEncoder().encode(JSON.stringify(updated)).byteLength >
      6 * 1024 * 1024
    )
      throw Error(
        "Refreshed analysis exceeds the 6 MiB project limit. Nothing was changed.",
      );
    await tx.store.put(updated);
    await tx.done;
    return updated;
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    await tx.done.catch(() => {});
    throw error;
  }
}
export async function saveRestorePlan(plan: RestorePlan) {
  for (const p of plan.projects)
    if (
      new TextEncoder().encode(JSON.stringify(p)).byteLength >
      6 * 1024 * 1024
    )
      throw Error(
        "A restored project exceeds the 6 MiB storage limit. Nothing was restored.",
      );
  const database = await db,
    tx = database.transaction("projects", "readwrite");
  try {
    let additions = 0;
    for (const p of plan.projects) {
      const current = await tx.store.get(p.id);
      if ((current ? JSON.stringify(current) : null) !== plan.expected[p.id])
        throw Error(
          "Local work changed while restore was being prepared. Nothing was restored; try again.",
        );
      if (!current) additions++;
    }
    if ((await tx.store.count()) + additions > 25)
      throw Error(
        "Restore would exceed the 25-project limit. Nothing was restored.",
      );
    for (const p of plan.projects) await tx.store.put(p);
    await tx.done;
  } catch (error) {
    try {
      tx.abort();
    } catch {}
    await tx.done.catch(() => {});
    throw error;
  }
}
export const defaultPreferences: Preferences = {
  level: "beginner",
  goal: "understand",
  theme: "dark",
  followDeviceTheme: false,
  tutor: "robot",
  color: "#c5eb82",
  motion: true,
  name: "Explorer",
};
const preferenceKey = "reporecode:preferences:v1";
export const loadPreferences = async () => {
  // Prefer the synchronous copy: a page may have closed before IndexedDB's
  // asynchronous transaction committed. Old installations still migrate below.
  try {
    const stored = localStorage.getItem(preferenceKey);
    if (stored && stored.length <= 200000)
      return validatePreferences({
        ...defaultPreferences,
        ...JSON.parse(stored),
      });
  } catch {
    // Storage may be blocked or an older/manual value may be malformed.
  }
  return validatePreferences({
    ...defaultPreferences,
    ...(await (await db).get("settings", "preferences")),
  });
};
export const savePreferences = async (p: Preferences) => {
  const validated = validatePreferences(p);
  // Write before the first await, so an immediate reload keeps the selection.
  // IndexedDB remains a fallback if browser localStorage is unavailable/full.
  try {
    localStorage.setItem(preferenceKey, JSON.stringify(validated));
  } catch {
    // Do not keep preferring an older copy after a quota failure.
    try {
      localStorage.removeItem(preferenceKey);
    } catch {}
  }
  await (await db).put("settings", validated, "preferences");
};
export function workerTask<T>(
  worker: Worker,
  input: unknown,
  timeout = 20000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(Error("Worker time limit exceeded. Try a smaller module."));
    }, timeout);
    worker.onmessage = (e) => {
      clearTimeout(timer);
      worker.terminate();
      e.data.error ? reject(Error(e.data.error)) : resolve(e.data.result);
    };
    worker.onerror = (e) => {
      clearTimeout(timer);
      worker.terminate();
      reject(Error(e.message));
    };
    worker.postMessage(input);
  });
}
