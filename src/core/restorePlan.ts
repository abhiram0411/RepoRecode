import type { Project } from "./types";
import { sourceHash } from "./curriculum";
import { exportProgress, mergeProgress } from "./progress";
export type RestorePlan = {
  projects: Project[];
  expected: Record<string, string | null>;
  added: number;
  merged: number;
  conflictCopies: number;
};

/** All inputs must have passed restoreBackup. This planner never mutates storage. */
export async function planProjectRestore(
  incoming: Project[],
  local: Project[],
): Promise<RestorePlan> {
  const current = new Map(local.map((p) => [p.id, p]));
  const hashes = new Map<string, string>();
  for (const p of local) hashes.set(p.id, await sourceHash(p.files));
  const result: RestorePlan = {
    projects: [],
    expected: {},
    added: 0,
    merged: 0,
    conflictCopies: 0,
  };
  const changed = new Map<string, Project>();
  for (const remote of incoming) {
    const hash = await sourceHash(remote.files);
    const sameId = current.get(remote.id);
    const match =
      sameId && hashes.get(sameId.id) === hash
        ? sameId
        : [...current.values()].find((p) => hashes.get(p.id) === hash);
    if (match) {
      const merged = await mergeProgress(match, await exportProgress(remote));
      // Restore missing work, but never replace an existing local draft or reflection.
      merged.drafts = { ...remote.drafts, ...match.drafts };
      merged.notes = { ...remote.notes, ...match.notes };
      result.expected[match.id] ??= local.find((p) => p.id === match.id)
        ? JSON.stringify(local.find((p) => p.id === match.id))
        : null;
      changed.set(match.id, merged);
      current.set(match.id, merged);
      result.merged++;
    } else {
      const added = {
        ...remote,
        sourceHash: hash,
        ...(sameId
          ? {
              id: crypto.randomUUID(),
              name: `${remote.name} (restored copy)`.slice(0, 200),
            }
          : {}),
      };
      result.expected[added.id] = null;
      changed.set(added.id, added);
      current.set(added.id, added);
      hashes.set(added.id, hash);
      result.added++;
      if (sameId) result.conflictCopies++;
    }
  }
  if (current.size > 25)
    throw Error(
      "Restoring these projects would exceed the 25-project limit. No projects were restored.",
    );
  result.projects = [...changed.values()];
  return result;
}
