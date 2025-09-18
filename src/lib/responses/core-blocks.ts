import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { coreBlocks } from "~/server/db/schemas";
import { BaseAPIResponseSchema } from "./base";

// Base core block schema from database
export const CoreBlockSchema = createSelectSchema(coreBlocks);

// GET /api/core-blocks & DELETE /api/core-blocks (bulk) - List response
export const CoreBlockListResponseSchema = BaseAPIResponseSchema.extend({
  coreBlocks: z.array(CoreBlockSchema).nullable(),
});

// POST, GET/[id], PUT/[id], DELETE/[id] - Single item response
export const SingleCoreBlockResponseSchema = BaseAPIResponseSchema.extend({
  coreBlock: CoreBlockSchema.nullable(),
});

// Type exports for frontend use
export type CoreBlock = z.infer<typeof CoreBlockSchema>;
export type CoreBlockListResponse = z.infer<typeof CoreBlockListResponseSchema>;
export type SingleCoreBlockResponse = z.infer<
  typeof SingleCoreBlockResponseSchema
>;
