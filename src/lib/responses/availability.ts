import { z } from "zod";
import { BaseAPIResponseSchema } from "./base";

// The joined data structure returned by all availability endpoints
export const AvailabilityWithCoreBlockSchema = z.object({
  coreId: z.number(),
  dayOfWeek: z.string(),
  shiftOfDay: z.string(),
  timeStart: z.number(),
  timeEnd: z.number(),
  numberOfEmployees: z.number(),
});

// Generalized response schema for all availability endpoints
export const AvailabilityListResponseSchema = BaseAPIResponseSchema.extend({
  availabilities: z.array(AvailabilityWithCoreBlockSchema),
});

// Type exports for frontend use
export type AvailabilityWithCoreBlock = z.infer<
  typeof AvailabilityWithCoreBlockSchema
>;
export type AvailabilityListResponse = z.infer<
  typeof AvailabilityListResponseSchema
>;
