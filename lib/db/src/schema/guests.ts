import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { households } from "./households";

export const guests = pgTable("guests", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  arrivalDatetime: timestamp("arrival_datetime", { mode: "string" }),
  airline: text("airline"),
  arrivalFlightNumber: text("arrival_flight_number"),
  arrivalAirport: text("arrival_airport"),
  departureDatetime: timestamp("departure_datetime", { mode: "string" }),
  departureFlightNumber: text("departure_flight_number"),
  departureAirport: text("departure_airport"),
  rentalCarInfo: text("rental_car_info"),
  transportationNeeds: text("transportation_needs"),
  flightStatus: text("flight_status").default("on_time"),
  notes: text("notes"),
});

export type Guest = typeof guests.$inferSelect;
export type InsertGuest = typeof guests.$inferInsert;
