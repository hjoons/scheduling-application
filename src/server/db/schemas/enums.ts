import { pgEnum } from "drizzle-orm/pg-core";

export const staffStatusEnum = pgEnum("staff_status", [
  "active",
  "inactive",
  "on_leave",
]);

export const userRoleEnum = pgEnum("user_role", [
  "administrator",
  "leadership",
  "staff",
  "trainee",
  "unvalidated",
]);
