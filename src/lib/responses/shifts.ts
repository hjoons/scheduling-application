import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { shifts, users, coreBlocks } from "~/server/db/schemas";
import { BaseAPIResponseSchema } from "./base";

// Base database schemas
const BaseShiftSchema = createSelectSchema(shifts);
const UserSchema = createSelectSchema(users);
const CoreBlockSchema = createSelectSchema(coreBlocks);

// Shift user data (subset of user fields used in shifts)
const ShiftUserSchema = UserSchema.pick({
  id: true,
  firstName: true,
  lastName: true,
  role: true,
  email: true,
});

// Core shift data (shifts + core_blocks joined)
const ShiftWithCoreBlockSchema = BaseShiftSchema.omit({
  createdAt: true,
  coreId: true, // Remove to add core block fields directly
}).extend({
  coreId: z.number(),
  timeStart: z.number(),
  timeEnd: z.number(),
  dayOfWeek: CoreBlockSchema.shape.dayOfWeek,
  shiftOfDay: CoreBlockSchema.shape.shiftOfDay,
  numberOfEmployees: z.number(),
});

// Full shift data (with user assignments)
const ShiftWithDetailsSchema = ShiftWithCoreBlockSchema.extend({
  users: z.array(ShiftUserSchema),
  totalAssignedUsers: z.number(),
});

// Response schemas for different endpoint types
export const ShiftListResponseSchema = BaseAPIResponseSchema.extend({
  shifts: z.array(ShiftWithDetailsSchema).nullable(),
});

export const SingleShiftResponseSchema = BaseAPIResponseSchema.extend({
  shift: ShiftWithDetailsSchema.nullable(),
});

export const SingleShiftCoreBlockResponseSchema = BaseAPIResponseSchema.extend({
  shift: ShiftWithCoreBlockSchema.nullable(),
});

// Export the schemas for reuse in other modules
export { ShiftWithDetailsSchema, ShiftWithCoreBlockSchema, ShiftUserSchema };

// Type exports for frontend use
export type ShiftUser = z.infer<typeof ShiftUserSchema>;
export type ShiftWithCoreBlock = z.infer<typeof ShiftWithCoreBlockSchema>;
export type ShiftWithDetails = z.infer<typeof ShiftWithDetailsSchema>;
export type ShiftListResponse = z.infer<typeof ShiftListResponseSchema>;
export type SingleShiftResponse = z.infer<typeof SingleShiftResponseSchema>;
export type SingleShiftCoreBlockResponse = z.infer<
  typeof SingleShiftCoreBlockResponseSchema
>;
