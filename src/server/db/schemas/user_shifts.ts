import { sql } from "drizzle-orm";
import { users } from "./users";
import { shifts } from "./shifts";
import { createTable } from "./utils";
import { bigserial, bigint, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const user_shifts = createTable(
  "user_shifts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: bigint("user_id", { mode: "number" })
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    shiftId: bigint("shift_id", { mode: "number" }).references(
      () => shifts.id,
      {
        onDelete: "cascade",
      },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => ({
    userShiftUnique: uniqueIndex("user_shift_idx").on(
      table.userId,
      table.shiftId,
    ),
  }),
);

export type UserShift = typeof user_shifts.$inferSelect;
export type UserShiftInsert = typeof user_shifts.$inferInsert;
