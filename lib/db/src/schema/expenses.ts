import {
  pgTable,
  serial,
  text,
  integer,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { households } from "./households";

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  merchant: text("merchant"),
  paidByHouseholdId: integer("paid_by_household_id").references(
    () => households.id,
    { onDelete: "set null" }
  ),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  allocationMethod: text("allocation_method").notNull(),
  participantHouseholdIds: text("participant_household_ids"),
  receiptUrl: text("receipt_url"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenseShares = pgTable("expense_shares", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id")
    .references(() => expenses.id, { onDelete: "cascade" })
    .notNull(),
  householdId: integer("household_id")
    .references(() => households.id, { onDelete: "cascade" })
    .notNull(),
  shareAmount: numeric("share_amount", { precision: 10, scale: 2 }).notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;
export type ExpenseShare = typeof expenseShares.$inferSelect;
export type InsertExpenseShare = typeof expenseShares.$inferInsert;
