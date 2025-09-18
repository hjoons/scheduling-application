import { z } from "zod";
import { BaseAPIResponseSchema } from "./base";

// The joined data structure returned by all exception endpoints
export const ExceptionWithCoreBlockSchema = z.object({
  id: z.number(),
  coreId: z.number(),
  timeStart: z.number(),
  timeEnd: z.number(),
  numberOfEmployees: z.number(),
  date: z.string(),
  description: z.string(),
});

// Response schema for a single exception
export const SingleExceptionResponseSchema = BaseAPIResponseSchema.extend({
  exception: ExceptionWithCoreBlockSchema,
});

// Response schema for multiple exceptions
export const ExceptionListResponseSchema = BaseAPIResponseSchema.extend({
  exceptions: z.array(ExceptionWithCoreBlockSchema),
});

// Type exports for frontend use
export type ExceptionWithCoreBlock = z.infer<
  typeof ExceptionWithCoreBlockSchema
>;
export type SingleExceptionResponse = z.infer<
  typeof SingleExceptionResponseSchema
>;
export type ExceptionListResponse = z.infer<typeof ExceptionListResponseSchema>;
