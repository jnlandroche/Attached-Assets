import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";

export const guideEntries = pgTable("guide_entries", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  subtitle: text("subtitle"),
  priceTier: text("price_tier"),
  distanceFromVilla: text("distance_from_villa"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  mapUrl: text("map_url"),
  reservationStatus: text("reservation_status"),
  websiteUrl: text("website_url"),
  favorited: boolean("favorited").default(false),
  sortOrder: integer("sort_order").default(0),
});

export type GuideEntry = typeof guideEntries.$inferSelect;
export type InsertGuideEntry = typeof guideEntries.$inferInsert;
