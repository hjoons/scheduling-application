import { sql } from "drizzle-orm";
import { createTable } from "./utils";
import { bigserial, timestamp, varchar } from "drizzle-orm/pg-core";
import { staffStatusEnum, userRoleEnum } from "./enums";

export const users = createTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  first_name: varchar("first_name", { length: 256 }).notNull(),
  last_name: varchar("last_name", { length: 256 }).notNull(),
  role: userRoleEnum("role").notNull().default("unvalidated"),
  status: staffStatusEnum("status").notNull().default("active"),
  email: varchar("email", { length: 256 }).unique().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
