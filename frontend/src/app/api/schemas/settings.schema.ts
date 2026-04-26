import { z } from "zod";
import { UUIDSchema, TimestampSchema } from "./common.schema";

// ============================================================
// Settings Schemas
// ============================================================

export const ApiKeySchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(128),
  value: z.string().min(1),
  lastUsed: TimestampSchema.nullish(),
});

export const ApiKeyListSchema = z.array(ApiKeySchema);

export const CreateApiKeySchema = z.object({
  name: z.string().min(1).max(128),
  value: z.string().min(1),
});

export const DefaultsSchema = z.object({
  chunkSize: z.string(),
  chunkOverlap: z.string(),
  embeddingModel: z.string(),
  llmModel: z.string(),
  temperature: z.string(),
  topK: z.string(),
});

export const UpdateDefaultsSchema = DefaultsSchema;

export type ApiKeyOutput = z.infer<typeof ApiKeySchema>;
export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type DefaultsOutput = z.infer<typeof DefaultsSchema>;
export type UpdateDefaultsInput = z.infer<typeof UpdateDefaultsSchema>;
