import { z } from "zod";

// Request
export const PrioritizeRequestSchema = z.object({
  tasks: z.array(z.string().min(1)).min(1).max(20),
  availableTimeHours: z.number().min(0.5).max(24).default(4),
});
export type PrioritizeRequest = z.infer<typeof PrioritizeRequestSchema>;

// Response
export const UrgencyLevel = z.enum(["Critical", "High", "Medium", "Low"]);

export const PrioritizedTaskSchema = z.object({
  rank: z.number().int().min(1),
  taskDescription: z.string(),
  urgency: UrgencyLevel,
  reason: z.string(),
  estimatedDurationMinutes: z.number().int().min(1).nullable(),
  allocatedMinutesToday: z.number().int().min(0),
  assumptions: z.array(z.string()),
});

export const PrioritizeResponseSchema = z.object({
  summary: z.string(),
  tasks: z.array(PrioritizedTaskSchema).min(1).max(20),
  warnings: z.array(z.string()),
});
export type PrioritizeResponse = z.infer<typeof PrioritizeResponseSchema>;
