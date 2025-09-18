import { z } from "zod";
import { BaseAPIResponseSchema } from "./base";
import { ShiftWithDetailsSchema } from "./shifts";
import { createSelectSchema } from "drizzle-zod";
import { coreBlocks } from "~/server/db/schemas";

// Reuse existing core block schema but pick only fields used in reports
const CoreBlockInfoSchema = createSelectSchema(coreBlocks).pick({
  id: true,
  dayOfWeek: true,
  shiftOfDay: true,
  timeStart: true,
  timeEnd: true,
  numberOfEmployees: true,
});

// Common period schema for date-range reports
const PeriodSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

// Shared base for user-specific reports (Tips & Hours)
const UserReportBaseSchema = z.object({
  userId: z.number(),
  firstName: z.string(),
  lastName: z.string(),
  period: PeriodSchema,
});

// Base shift data schema that both Tips and Hours share
const BaseReportShiftSchema = z.object({
  shiftId: z.number(),
  date: z.string(),
  coreBlock: CoreBlockInfoSchema,
});

// Tips Report Schemas
const TipsShiftDataSchema = BaseReportShiftSchema.extend({
  userTipShare: z.number(),
  totalShiftTips: z.number(),
  eligibleWorkers: z.number(),
});

const TipsReportSchema = UserReportBaseSchema.extend({
  summary: z.object({
    totalTips: z.number(),
    totalShifts: z.number(),
  }),
  data: z.array(TipsShiftDataSchema),
});

export const TipsReportResponseSchema = BaseAPIResponseSchema.extend({
  report: TipsReportSchema.nullable(),
});

// Hours Report Schemas
const HoursShiftDataSchema = BaseReportShiftSchema.extend({
  hoursWorked: z.number(),
});

const HoursReportSchema = UserReportBaseSchema.extend({
  summary: z.object({
    totalHours: z.number(),
    totalShifts: z.number(),
  }),
  data: z.array(HoursShiftDataSchema),
});

export const HoursReportResponseSchema = BaseAPIResponseSchema.extend({
  report: HoursReportSchema.nullable(),
});

// Schedule History Response Schema (reuses existing ShiftWithDetailsSchema)
export const ScheduleHistoryResponseSchema = BaseAPIResponseSchema.extend({
  shifts: z.array(ShiftWithDetailsSchema).nullable(),
  filters: PeriodSchema.optional(),
});

// Type exports for frontend use
export type TipsShiftData = z.infer<typeof TipsShiftDataSchema>;
export type TipsReport = z.infer<typeof TipsReportSchema>;
export type TipsReportResponse = z.infer<typeof TipsReportResponseSchema>;

export type HoursShiftData = z.infer<typeof HoursShiftDataSchema>;
export type HoursReport = z.infer<typeof HoursReportSchema>;
export type HoursReportResponse = z.infer<typeof HoursReportResponseSchema>;

export type ScheduleHistoryResponse = z.infer<
  typeof ScheduleHistoryResponseSchema
>;

// Internal schema exports for potential reuse
export type CoreBlockInfo = z.infer<typeof CoreBlockInfoSchema>;
export type Period = z.infer<typeof PeriodSchema>;
export type UserReportBase = z.infer<typeof UserReportBaseSchema>;
export type BaseReportShift = z.infer<typeof BaseReportShiftSchema>;
