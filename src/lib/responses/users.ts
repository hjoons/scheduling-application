import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { users } from "~/server/db/schemas";
import { BaseAPIResponseSchema } from "./base";

// Base user schema from database
export const UserSchema = createSelectSchema(users);

export const SingularUserResponseSchema = BaseAPIResponseSchema.extend({
  user: UserSchema.nullable(),
});

export const ListUserResponseSchema = BaseAPIResponseSchema.extend({
  users: z.array(UserSchema).nullable(),
});

// Type exports for use in frontend
export type User = z.infer<typeof UserSchema>;
export type SingularUserResponse = z.infer<typeof SingularUserResponseSchema>;
export type ListUserResponse = z.infer<typeof ListUserResponseSchema>;
