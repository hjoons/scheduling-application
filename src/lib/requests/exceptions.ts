import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { exceptions } from "~/server/db/schemas";

// GET /api/exceptions/user/[userId] - Exception date filtering
export const ExceptionDateRequestSchema = z
  .object({
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
      .nullish(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
      .nullish(),
  })
  .strict()
  .refine(
    (data) =>
      data.startDate === null ||
      !data.endDate === null ||
      (data.startDate &&
        data.endDate &&
        new Date(data.startDate) <= new Date(data.endDate)),
    {
      message:
        "Dates must be provided together and start date cannot be after end date",
      path: ["startDate"],
    },
  );

// POST /api/exceptions - Create ONE exception entry
export const CreateExceptionRequestSchema = createInsertSchema(exceptions)
  .omit({ id: true, createdAt: true })
  .strict();

// PUT /api/exceptions/[id] - Update ONE exception entry
export const UpdateExceptionRequestSchema = createInsertSchema(exceptions)
  .omit({ id: true, createdAt: true })
  .partial();
