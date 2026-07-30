import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const itineraryItems = pgTable("itinerary_items", {
  id: serial("id").primaryKey(),
  dayLabel: text("day_label").notNull(),
  time: text("time"),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").default("general"),
  sortOrder: integer("sort_order").default(0),
});

export type ItineraryItem = typeof itineraryItems.$inferSelect;
export type InsertItineraryItem = typeof itineraryItems.$inferInsert;
