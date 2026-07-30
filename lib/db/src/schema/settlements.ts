import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";

export const settlements = pgTable("settlements", {
  id: serial("id").primaryKey(),
  fromHouseholdId: integer("from_household_id")
    .references(() => households.id, { onDelete: "cascade" })
    .notNull(),
  toHouseholdId: integer("to_household_id")
    .references(() => households.id, { onDelete: "cascade" })
    .notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

export type Settlement = typeof settlements.$inferSelect;
export type InsertSettlement = typeof settlements.$inferInsert;
