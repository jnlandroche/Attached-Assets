import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  photoUrl: text("photo_url"),
  phone: text("phone"),
  email: text("email"),
  notes: text("notes"),
  sortOrder: integer("sort_order").default(0),
});

export type Household = typeof households.$inferSelect;
export type InsertHousehold = typeof households.$inferInsert;
