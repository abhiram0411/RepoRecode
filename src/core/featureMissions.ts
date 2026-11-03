export const featureMissions = {
  "double-output": {
    label: "Numbers · double the result",
    requirement:
      "Return exactly twice the original function’s numeric output for the same inputs. Keep its name and parameters. Every successful reference probe must return a finite number, and doubling it must stay finite.",
  },
  "uppercase-output": {
    label: "Strings · uppercase the result",
    requirement:
      "Return the original function’s string output converted to uppercase for the same inputs. Keep its name and parameters. Every successful reference probe must return a string. At least one probe must change.",
  },
  "negate-output": {
    label: "Booleans · reverse the result",
    requirement:
      "Return the opposite of the original function’s boolean output for the same inputs: true becomes false and false becomes true. Keep its name and parameters. Every successful reference probe must return a boolean; truthy or falsy values are not accepted as booleans.",
  },
} as const;

export type FeatureMission = keyof typeof featureMissions;
export const featureMissionIds = Object.keys(
  featureMissions,
) as FeatureMission[];
export function isFeatureMission(value: unknown): value is FeatureMission {
  return typeof value === "string" && Object.hasOwn(featureMissions, value);
}
export function isMissionKey(
  key: string,
  symbolIds: Iterable<string>,
): boolean {
  const separator = key.lastIndexOf(":");
  return (
    separator >= 0 &&
    isFeatureMission(key.slice(separator + 1)) &&
    [...symbolIds].includes(key.slice(0, separator))
  );
}

/** Transforms the validated primitive output envelope, never executable code. */
export function missionOutput(
  mission: FeatureMission,
  output: { type: string; value?: unknown },
): { display: string; key: string } {
  let value: number | string | boolean;
  if (mission === "double-output") {
    if (
      output.type !== "number" ||
      typeof output.value !== "number" ||
      !Number.isFinite(output.value * 2)
    )
      throw Error(
        "This mission requires finite numeric outputs on every successful reference probe.",
      );
    value = output.value * 2;
  } else if (mission === "uppercase-output") {
    if (output.type !== "string" || typeof output.value !== "string")
      throw Error(
        "This mission requires string outputs on every successful reference probe.",
      );
    value = output.value.toUpperCase();
  } else if (mission === "negate-output") {
    if (output.type !== "boolean" || typeof output.value !== "boolean")
      throw Error(
        "This mission requires boolean outputs on every successful reference probe.",
      );
    value = !output.value;
  } else {
    throw Error("Unknown feature mission.");
  }
  const display = JSON.stringify({ value, type: typeof value });
  const key = JSON.stringify([
    typeof value,
    typeof value === "number" ? String(value) : value,
  ]);
  if (display.length > 16000 || key.length > 16000)
    throw Error("Transformed output exceeds the mission size limit.");
  return { display, key };
}
