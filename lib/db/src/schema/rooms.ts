import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";
import { households } from "./households";

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  bedConfig: text("bed_config"),
  bathLayout: text("bath_layout"),
  occupancy: integer("occupancy"),
  photoUrl: text("photo_url"),
  notes: text("notes"),
  assignedHouseholdId: integer("assigned_household_id").references(
    () => households.id,
    { onDelete: "set null" }
  ),
  sortOrder: integer("sort_order").default(0),
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;
