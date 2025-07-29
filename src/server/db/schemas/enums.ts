import { pgEnum } from "drizzle-orm/pg-core";

export const staffStatusEnum = pgEnum("staff_status", [
  "active",
  "inactive",
  "on_leave",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "mon",
  "tues",
  "weds",
  "thurs",
  "fri",
  "sat",
  "sun",
]);

export const shiftOfDayEnum = pgEnum("shift_of_day", ["m1", "m2", "e1", "e2"]);

export const userRoleEnum = pgEnum("user_role", [
  "administrator",
  "leadership",
  "staff",
  "trainee",
  "unvalidated",
]);
