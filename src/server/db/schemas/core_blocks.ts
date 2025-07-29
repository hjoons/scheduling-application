import { sql } from "drizzle-orm";
import { createTable } from "./utils";
import { dayOfWeekEnum, shiftOfDayEnum } from "./enums";
import { bigserial, bigint, timestamp } from "drizzle-orm/pg-core";

export const coreBlocks = createTable("core_blocks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
  shiftOfDay: shiftOfDayEnum("shift_of_day").notNull(),
  timeStart: bigint("time_start", { mode: "number" }).notNull(),
  timeEnd: bigint("time_end", { mode: "number" }).notNull(),
  numberOfEmployees: bigint("number_of_employees", {
    mode: "number",
  }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type CoreBlock = typeof coreBlocks.$inferSelect;
export type CoreBlockInsert = typeof coreBlocks.$inferInsert;
