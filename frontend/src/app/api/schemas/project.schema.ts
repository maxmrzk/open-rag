import { z } from "zod";
import { UUIDSchema, TimestampSchema } from "./common.schema";

// ============================================================
// Project Schemas
// ============================================================

export const ProjectSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  createdAt: TimestampSchema,
  systemCount: z.number().int().min(0),
  runCount: z.number().int().min(0),
});

export const ProjectListSchema = z.array(ProjectSchema);

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

export type ProjectInput = z.infer<typeof CreateProjectSchema>;
export type ProjectOutput = z.infer<typeof ProjectSchema>;
