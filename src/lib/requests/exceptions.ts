import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { exceptions } from "~/server/db/schemas";

// POST /api/exceptions - Create ONE exception entry
export const CreateExceptionRequestSchema = createInsertSchema(exceptions)
  .omit({ id: true, createdAt: true })
  .strict();

// PUT /api/exceptions/[id] - Update ONE exception entry
export const UpdateExceptionRequestSchema = createInsertSchema(exceptions)
  .omit({ id: true, createdAt: true })
  .partial();
