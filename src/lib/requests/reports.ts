import { z } from "zod";
import { ValidationError } from "../errors";

export const DateRangeReportSchema = z
  .object({
    userId: z.string().transform((val) => {
      const id = parseInt(val);
      if (isNaN(id) || id <= 0) {
        throw new ValidationError("Invalid user ID format");
      }
      return id;
    }),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  })
  .strict()
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "Start date cannot be after end date",
    path: ["startDate"],
  });

// GET /api/reports/schedule-history - Schedule history
export const ScheduleHistoryQuerySchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format"),
  })
  .strict()
  .refine((data) => new Date(data.startDate) <= new Date(data.endDate), {
    message: "Start date cannot be after end date",
    path: ["startDate"],
  });
