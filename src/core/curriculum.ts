import type { Project, SymbolInfo } from "./types";
export const definitions: Record<string, string> = {
  "Math.min":
    "Returns the smallest supplied number. It is often used to impose an upper bound.",
  "Math.max":
    "Returns the largest supplied number. It is often used to impose a lower bound.",
  "Math.round":
    "Rounds a number to its nearest integer; halfway values round toward positive infinity.",
  "Math.floor": "Returns the greatest integer less than or equal to the input.",
  "Math.ceil":
    "Returns the smallest integer greater than or equal to the input.",
  useState:
    "A React hook that returns the current state and a setter that queues an update. Updates cause a later render.",
  useEffect:
    "A React hook that synchronizes with an external system after a commit; its cleanup runs before reruns and on unmount.",
  useMemo:
    "Caches a calculation between renders when its dependencies are unchanged. Correctness must not depend on this cache.",
  useCallback:
    "Caches a function identity between renders while dependencies remain unchanged.",
  fetch:
    "Starts a network request and returns a promise for a Response. HTTP errors such as 404 do not automatically reject the promise.",
  "JSON.stringify":
    "Serializes supported JavaScript values into JSON text; some values are omitted or cannot be represented.",
  "JSON.parse": "Parses JSON text. Malformed JSON throws a SyntaxError.",
  Types:
    "TypeScript annotations describe expected values during static checking. They do not validate untrusted input at runtime.",
  JSX: "Syntax describing UI elements. JSX is compiled into JavaScript element creation; it is not an HTML string.",
  State:
    "Values retained by React between renders. A state update schedules rendering rather than changing a captured value in-place.",
  "Control flow":
    "Conditions select which statements execute. Trace each branch with concrete input values.",
  "Return values":
    "A return statement ends the current function call and supplies its result to the caller.",
};
export function glossary(symbol: SymbolInfo) {
  return [...new Set([...symbol.calls, ...symbol.concepts])]
    .filter((k) => definitions[k])
    .map((term) => ({ term, definition: definitions[term] }));
}
export function achievements(projects: Project[]) {
  const completed = projects.reduce((n, p) => n + p.completed.length, 0);
  const concepts = new Set(
    projects.flatMap((p) =>
      p.analysis.symbols
        .filter((s) => p.completed.includes(s.id))
        .flatMap((s) => s.concepts),
    ),
  );
  const comeback = projects.some((p) =>
    p.completed.some((id) => {
      const a = p.attempts.filter((a) => a.symbolId === id);
      return a.some(
        (x, i) => !x.passed && a.slice(i + 1).some((y) => y.passed),
      );
    }),
  );
  return [
    {
      id: "first",
      title: "First principles",
      description: "Pass your first supported practice exercise.",
      earned: completed >= 1,
    },
    {
      id: "five",
      title: "Builder’s instinct",
      description: "Pass five distinct supported practice exercises.",
      earned: completed >= 5,
    },
    {
      id: "comeback",
      title: "Debugging mindset",
      description: "Correct a failed attempt and pass the same exercise.",
      earned: comeback,
    },
    {
      id: "concepts",
      title: "Connecting ideas",
      description: "Pass exercises spanning three source concepts.",
      earned: concepts.size >= 3,
    },
  ];
}
export function mastery(project: Project) {
  const eligible = project.analysis.symbols.filter((s) => s.standalone);
  const passed = project.completed.filter((id) =>
    eligible.some((s) => s.id === id),
  ).length;
  return {
    eligible: eligible.length,
    passed,
    rank:
      project.completed.length === 0
        ? "Discovering"
        : passed === eligible.length && eligible.length > 0
          ? "Practiced snapshot"
          : "Building fluency",
  };
}
export async function sourceHash(files: Project["files"]) {
  const canonical = JSON.stringify(
    [...files].sort((a, b) => a.path.localeCompare(b.path)),
  );
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(canonical),
  );
  return [...new Uint8Array(bytes)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
