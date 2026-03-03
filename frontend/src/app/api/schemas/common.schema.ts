import { z } from "zod";

// ============================================================
// Common Zod Schemas — Shared across all API contracts
// ============================================================

export const UUIDSchema = z.string().uuid();

export const TimestampSchema = z.string().datetime({ offset: true }).or(z.string());

export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
  total: z.number().int().min(0),
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    success: z.boolean(),
    message: z.string().nullish(),
    pagination: PaginationSchema.optional(),
  });

export type UUID = z.infer<typeof UUIDSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
