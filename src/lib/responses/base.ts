import { z } from "zod";

// Base API error schema - reusable across all endpoints
export const APIErrorResponseSchema = z.object({
  type: z.string(),
  message: z.string(),
  details: z.string().optional(),
});

// Base API response schema - reusable across all endpoints
export const BaseAPIResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  error: APIErrorResponseSchema.nullable(),
});

// Type exports
export type APIErrorResponse = z.infer<typeof APIErrorResponseSchema>;
export type BaseAPIResponse = z.infer<typeof BaseAPIResponseSchema>;
