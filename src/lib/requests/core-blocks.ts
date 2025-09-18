import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { coreBlocks } from "~/server/db/schemas";

// POST /api/core-blocks - Create ONE core block with a specific "{day}-{block}" id
export const CreateCoreBlockRequestSchema = createInsertSchema(coreBlocks).omit(
  { createdAt: true },
);

// PUT /api/core-blocks/[id] - Update ONE core block
export const UpdateCoreBlockRequestSchema = createInsertSchema(coreBlocks)
  .omit({ createdAt: true })
  .partial();

// GET /api/core-blocks - List core blocks via query parameters
export const GetCoreBlocksQuerySchema = z
  .object({
    dayOfWeek: z.enum(coreBlocks.dayOfWeek.enumValues).nullish(),
    shiftOfDay: z.enum(coreBlocks.shiftOfDay.enumValues).nullish(),
  })
  .strict();
