import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { shifts, user_shifts } from "~/server/db/schemas";

// POST /api/shifts - Create ONE shift (without users)
export const CreateShiftRequestSchema = createInsertSchema(shifts, {
  tipsEarned: z.number().min(0, "Tips earned must be non-negative").default(0),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
}).omit({ id: true, createdAt: true });

// PUT /api/shifts/[id] - Update ONE shift
export const UpdateShiftRequestSchema = createInsertSchema(shifts, {
  tipsEarned: z.number().min(0, "Tips earned must be non-negative"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
})
  .omit({ id: true, createdAt: true })
  .partial();

// GET /api/shifts - List shifts via query parameters
export const GetShiftsQuerySchema = z
  .object({
    userId: z
      .string()
      .transform((val) => parseInt(val))
      .pipe(z.number().positive())
      .nullish(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
      .nullish(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
      .nullish(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
      .nullish(),
  })
  .strict();

// POST /api/shifts/[id]/users - Assign users to a shift
export const AssignUsersToShiftRequestSchema = z
  .object({
    userIds: z
      .array(z.number().int().positive("User ID must be a positive integer"))
      .min(1, "At least one user ID must be provided")
      .max(5, "Cannot assign more than 5 users to a single shift"),
  })
  .strict();

// User shift schema for validation
export const UserShiftRequestSchema = createInsertSchema(user_shifts).omit({
  id: true,
  createdAt: true,
});
