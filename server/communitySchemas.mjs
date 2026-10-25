import { z } from "zod";
export const feedbackSchema = z
  .object({
    category: z.enum(["feature", "bug", "general"]),
    message: z.string().trim().min(10).max(3000),
    rating: z.number().int().min(1).max(5).optional(),
    contact: z.string().email().max(254).optional(),
    website: z.literal("").optional(),
  })
  .strict();
export const activitySchema = z
  .object({
    installationId: z.string().uuid(),
    event: z.enum(["installation", "active"]),
  })
  .strict();
export const deletionSchema = z
  .object({ installationId: z.string().uuid() })
  .strict();
