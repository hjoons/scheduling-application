import { sql } from "drizzle-orm";
import { users } from "./users";
import { coreBlocks } from "./core_blocks";
import { createTable } from "./utils";
import { bigserial, bigint, timestamp } from "drizzle-orm/pg-core";

export const availabilities = createTable("availabilities", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  coreId: bigint("core_id", { mode: "number" })
    .references(() => coreBlocks.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Availability = typeof availabilities.$inferSelect;
export type AvailabilityInsert = typeof availabilities.$inferInsert;
