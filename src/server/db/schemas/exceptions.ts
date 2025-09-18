import { sql } from "drizzle-orm";
import { createTable } from "./utils";
import { users } from "./users";
import { coreBlocks } from "./core_blocks";
import {
  bigserial,
  bigint,
  date,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";

export const exceptions = createTable("exceptions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" })
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  coreId: bigint("core_id", { mode: "number" })
    .references(() => coreBlocks.id, { onDelete: "cascade" })
    .notNull(),
  date: date("date").notNull(),
  description: varchar("description", { length: 512 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type Exception = typeof exceptions.$inferSelect;
export type ExceptionInsert = typeof exceptions.$inferInsert;
