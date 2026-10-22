import { z } from "zod";
import type { Preferences } from "./types";
import { themeIds } from "./themes";
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const preferencesSchema = z.object({
  level: z.enum(["beginner", "intermediate", "advanced"]),
  goal: z.enum(["understand", "debug", "interview"]),
  theme: z.enum(themeIds),
  followDeviceTheme: z.boolean().optional(),
  tutor: z.enum(["robot", "boy", "girl"]),
  color,
  motion: z.boolean(),
  name: z.string().max(40),
  hair: z.enum(["short", "long", "none"]).optional(),
  outfit: z.enum(["jacket", "hoodie", "tee"]).optional(),
  accessory: z.enum(["none", "glasses", "cap"]).optional(),
  glasses: z.boolean().optional(),
  cap: z.boolean().optional(),
  skinColor: color.optional(),
  hairColor: color.optional(),
  background: color.optional(),
  picture: z
    .string()
    .max(150000)
    .regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
    .optional(),
});
export function validatePreferences(value: unknown): Preferences {
  return preferencesSchema.parse(value);
}
