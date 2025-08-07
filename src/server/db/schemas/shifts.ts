import { sql } from "drizzle-orm";
import { users } from "./users";
import { coreBlocks } from "./core_blocks";
import { createTable } from "./utils";
import { bigserial, bigint, timestamp, date, real } from "drizzle-orm/pg-core";

export const shifts = createTable("shifts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  coreId: bigint("core_id", { mode: "number" })
    .references(() => coreBlocks.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  tipsEarned: real("tips_earned").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Shift = typeof shifts.$inferSelect;
export type ShiftInsert = typeof shifts.$inferInsert;
