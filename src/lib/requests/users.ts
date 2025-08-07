import { z } from "zod";
import { createInsertSchema } from "drizzle-zod";
import { users, userRoleEnum, staffStatusEnum } from "~/server/db/schemas";

// POST /api/users - Create ONE user
export  const CreateUserRequestSchema = createInsertSchema(users).omit({id: true, createdAt: true});

// PUT /api/users/[id] - Update ONE user
export const UpdateUserRequestSchema = createInsertSchema(users).omit({id: true, createdAt: true}).partial();

// GET /api/users - List users via query parameters
export const GetUsersQuerySchema = z.object({
    role: z.enum(userRoleEnum.enumValues).nullish(),
    status: z.enum(staffStatusEnum.enumValues).nullish(),
}).strict();