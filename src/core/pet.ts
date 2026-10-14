import type { Evaluation } from "./types";
export type PetState =
  | "idle"
  | "greeting"
  | "watching"
  | "frustrated"
  | "celebrating"
  | "achievement"
  | "hidden";
export type PetEvent = { id: number; state: PetState };
export function reactionForResult(
  result: Evaluation,
  achievement = false,
): PetState {
  if (!result.supported) return "watching";
  if (result.passed) return achievement ? "achievement" : "celebrating";
  return "frustrated";
}
export const petCaptions: Record<PetState, string> = {
  idle: "Ready when you are.",
  greeting: "Hey, explorer!",
  watching: "One step at a time.",
  frustrated: "Take a breath. You can try again.",
  celebrating: "Nice work!",
  achievement: "A new milestone!",
  hidden: "",
};
