import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { availabilities, dayOfWeekEnum, shiftOfDayEnum } from "~/server/db/schemas";

// GET /api/availability/user/[userId] - Query parameters for filtering
export const GetUserAvailabilityQuerySchema = z.object({
    dayOfWeek: z.enum(dayOfWeekEnum.enumValues).nullish(),
    shiftOfDay: z.enum(shiftOfDayEnum.enumValues).nullish(),
}).strict();

// POST & POST /api/availability/[userId] - Set availability for a user using a list of availability entries 
const BaseAvailabilitySchema = createInsertSchema(availabilities).omit({id: true, createdAt: true});

export const CreateAvailabilityRequestSchema = z.object({
    availability: z.array(BaseAvailabilitySchema),
})