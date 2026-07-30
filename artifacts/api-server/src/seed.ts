import { db, households, rooms, guideEntries, contacts, settings, itineraryItems } from "@workspace/db";

async function seed() {
  // eslint-disable-next-line no-console
  console.log("Seeding database...");

  // Settings
  await db
    .insert(settings)
    .values([
      { key: "trip_title", value: "Jordan's 40th — St. John, USVI" },
      { key: "property_name", value: "Terrapin Station (fka Stella Bella)" },
      { key: "property_location", value: "Chocolate Hole, St. John, USVI" },
      { key: "vrbo_url", value: "https://www.vrbo.com/2090694" },
      { key: "guest_rating", value: "9.6 / 10 — Exceptional (82 reviews)" },
      { key: "check_in_date", value: "" },
      { key: "check_out_date", value: "" },
      { key: "weather_summary", value: "Upper 80s°F, brief tropical showers possible — typical Caribbean summer" },
      { key: "announcement", value: "Add a note here for the group — packing reminders, dinner plans, anything else." },
      { key: "target_budget", value: "" },
      { key: "hero_photo", value: "/api/images/group-formal.jpg" },
      {
        key: "villa_gallery",
        value: JSON.stringify([
          "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/567949bb.jpg?impolicy=resizecrop&rw=1200&ra=fit",
          "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/a0784551.jpg?impolicy=resizecrop&rw=1200&ra=fit",
          "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/82e7684c.jpg?impolicy=resizecrop&rw=1200&ra=fit",
          "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/b2170c33.jpg?impolicy=resizecrop&rw=1200&ra=fit",
          "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/6854944b.jpg?impolicy=resizecrop&rw=1200&ra=fit",
        ]),
      },
      { key: "check_in_time", value: "" },
      { key: "check_out_time", value: "" },
      { key: "house_rules", value: "" },
      {
        key: "birthday_photos",
        value: JSON.stringify([
          "/api/images/jordan-wine.jpg",
          "/api/images/jordan-sunset-couple.jpg",
          "/api/images/jordan-boat.jpg",
          "/api/images/jordan-fishing-lake.jpg",
          "/api/images/jordan-fish-catch.jpg",
        ]),
      },
      {
        key: "group_photos",
        value: JSON.stringify([
          "/api/images/group-formal.jpg",
          "/api/images/group-stadium.jpg",
          "/api/images/group-tailgate.jpg",
        ]),
      },
    ])
    .onConflictDoNothing();

  // Households
  const householdRows = await db
    .insert(households)
    .values([
      { name: "Jordan & Danielle", sortOrder: 1 },
      { name: "Justin & Allison", sortOrder: 2 },
      { name: "Eric & Rachel", sortOrder: 3 },
      { name: "Jeff & Keri", sortOrder: 4 },
    ])
    .returning();

  const byName = Object.fromEntries(householdRows.map((h) => [h.name, h.id]));

  // Rooms
  await db.insert(rooms).values([
    {
      name: "Primary Suite 1 (Upstairs, East)",
      bedConfig: "King bed + separate day bed",
      bathLayout: "Private en-suite bath, 350+ sf, large covered screened-in porch, panoramic water views",
      occupancy: 2,
      photoUrl: "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/db2b32f0.jpg?impolicy=resizecrop&rw=900&ra=fit",
      notes: "Listing caption confirms: \"East Primary BR\".",
      assignedHouseholdId: byName["Jordan & Danielle"],
      sortOrder: 1,
    },
    {
      name: "Primary Suite 2 (Upstairs, West)",
      bedConfig: "King bed + separate day bed",
      bathLayout: "Private en-suite bath, 350+ sf, large covered screened-in porch, same panoramic views",
      occupancy: 2,
      photoUrl: null,
      notes: "No confirmed listing photo of this specific room — add one once you're there.",
      assignedHouseholdId: byName["Justin & Allison"],
      sortOrder: 2,
    },
    {
      name: "Bedroom 3 (Downstairs, mini-apartment)",
      bedConfig: "King bed + space for a full-size air mattress in separate living area",
      bathLayout: "Private bath, kitchenette, separate entrance",
      occupancy: 3,
      photoUrl: "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/f49c41f0.jpg?impolicy=resizecrop&rw=900&ra=fit",
      notes: "Listing caption: \"West Apartment - Deck of Bedroom #3\".",
      assignedHouseholdId: byName["Eric & Rachel"],
      sortOrder: 3,
    },
    {
      name: "Bedroom 4 (Downstairs, efficiency)",
      bedConfig: "Queen bed",
      bathLayout: "Private bath, full kitchen, separate entrance",
      occupancy: 2,
      photoUrl: null,
      notes: "No confirmed listing photo — add one once you're there.",
      assignedHouseholdId: byName["Jeff & Keri"],
      sortOrder: 4,
    },
  ]);

  // Guide entries
  const WEBSITES: Record<string, string> = {
    "Shambles": "https://www.shamblesvi.com",
    "The Longboard": "https://www.thelongboardstjohn.com",
    "Cruz Bay Landing": "https://www.cruzbaylanding.com",
    "Morgan's Mango": "https://www.morgansmango.com",
    "La Tapa": "https://www.latapastjohn.com",
    "Lime Inn": "https://www.limeoutvi.com/lime-inn",
    "High Tide Bar & Grill": "https://www.hightidestjohn.com",
    "Sun Dog Café": "https://www.sundogcafe.com",
    "Lime Out": "https://www.limeoutvi.com",
    "The Tap Room (Mongoose Junction)": "https://www.stjohnbrewers.com",
    "Ocean Runner Powerboat Rentals": "https://oceanrunnerusvi.com",
    "Wharfside Watersports": "https://wharfsidewatersports.com",
    "Palm Tree Charters": "https://palmtreecharters.com",
  };

  type GuideRow = {
    type: string; name: string; subtitle?: string; priceTier?: string;
    distanceFromVilla?: string; notes?: string; sortOrder: number;
    websiteUrl?: string | null; mapUrl?: string; favorited?: boolean;
  };

  function withExtras(row: GuideRow): GuideRow {
    return {
      ...row,
      websiteUrl: WEBSITES[row.name] ?? null,
      mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.name + ", St. John, USVI")}`,
      favorited: false,
    };
  }

  const guideRows = [
    // Dining
    { type: "dining", name: "Shambles", subtitle: "Upscale / New American", priceTier: "$$$", distanceFromVilla: "9 min drive", notes: "Closest fine-dining pick to the villa.", sortOrder: 1 },
    { type: "dining", name: "Woody's Seafood Saloon", subtitle: "Seafood / Casual", priceTier: "$$", distanceFromVilla: "7 min drive", notes: "Lively, good raw bar, popular with locals. (340) 779-4625.", sortOrder: 2 },
    { type: "dining", name: "The Longboard", subtitle: "Coastal / Cocktail kitchen", priceTier: "$$", distanceFromVilla: "7 min drive", notes: "Creative cocktails, ceviche, shrimp tostones, poke bowl.", sortOrder: 3 },
    { type: "dining", name: "Cruz Bay Landing", subtitle: "American / Caribbean", priceTier: "$$", distanceFromVilla: "7 min drive", notes: "Across from the ferry dock; seared scallops, Mahi Mahi, live music.", sortOrder: 4 },
    { type: "dining", name: "Morgan's Mango", subtitle: "Caribbean fusion", priceTier: "$$", distanceFromVilla: "7 min drive", notes: "Open-air terrace, rotisserie chicken, good rum cocktails.", sortOrder: 5 },
    { type: "dining", name: "La Tapa", subtitle: "Spanish / Mediterranean tapas", priceTier: "$$$", distanceFromVilla: "7 min drive", notes: "Refined tapas, great wine list, reservations recommended.", sortOrder: 6 },
    { type: "dining", name: "Lime Inn", subtitle: "Seafood / Island", priceTier: "$$", distanceFromVilla: "7 min drive", notes: "Reliable local favorite, shrimp scampi, garlic bread.", sortOrder: 7 },
    { type: "dining", name: "Sun Dog Café", subtitle: "Breakfast & lunch / Café", priceTier: "$", distanceFromVilla: "7 min drive", notes: "Best breakfast in Cruz Bay — eggs, crepes, strong coffee.", sortOrder: 8 },
    // Bars
    { type: "bar", name: "High Tide Bar & Grill", subtitle: "Waterfront bar", priceTier: "$$", distanceFromVilla: "7 min drive", notes: "Sunset drinks on the water, good happy hour.", sortOrder: 1 },
    { type: "bar", name: "The Tap Room (Mongoose Junction)", subtitle: "Craft beer / Brewpub", priceTier: "$$", distanceFromVilla: "7 min drive", notes: "St. John Brewers on-site, rotating local taps.", sortOrder: 2 },
    { type: "bar", name: "Woody's Seafood Saloon", subtitle: "Classic dive bar", priceTier: "$", distanceFromVilla: "7 min drive", notes: "Affordable drinks, local crowd, no frills.", sortOrder: 3 },
    { type: "bar", name: "Lime Out (floating taco bar)", subtitle: "Floating bar / Tacos", priceTier: "$$", distanceFromVilla: "25 min drive + boat", notes: "Boat or water-taxi out near Coral Bay. Worth the trip.", sortOrder: 4 },
    // Activities
    { type: "activity", name: "Reef Bay Trail", subtitle: "Hike / 5.5 mi roundtrip", distanceFromVilla: "15 min drive", notes: "Plantation ruins, petroglyphs, coastal views. Half day.", sortOrder: 1 },
    { type: "activity", name: "Trunk Bay Beach & Snorkel Trail", subtitle: "Snorkeling / Beach", distanceFromVilla: "10 min drive", notes: "Underwater snorkel trail, famous turtle sightings. $5 entrance fee.", sortOrder: 2 },
    { type: "activity", name: "Coral Bay Exploration", subtitle: "Town / local vibe", distanceFromVilla: "20 min drive", notes: "Quieter, more local side of the island — Skinny Legs bar, views.", sortOrder: 3 },
    { type: "activity", name: "Salt Pond Bay", subtitle: "Beach / Snorkeling", distanceFromVilla: "20 min drive", notes: "Less crowded, excellent snorkeling, sea turtles common.", sortOrder: 4 },
    // Beaches
    { type: "beach", name: "Chocolate Hole Beach", subtitle: "3 min walk from villa", distanceFromVilla: "3 min walk", notes: "Calm, quiet, almost always empty. Your backyard beach.", sortOrder: 1 },
    { type: "beach", name: "Trunk Bay", subtitle: "NPS flagship beach", distanceFromVilla: "10 min drive", notes: "White sand, snorkel trail, facilities. Most photogenic on the island.", sortOrder: 2 },
    { type: "beach", name: "Hawksnest Bay", subtitle: "Calm / family-friendly", distanceFromVilla: "8 min drive", notes: "Good snorkeling, pavilions, less crowded than Trunk Bay.", sortOrder: 3 },
    { type: "beach", name: "Cinnamon Bay", subtitle: "Long stretch / camping", distanceFromVilla: "12 min drive", notes: "Longest beach on St. John, watersport rentals available.", sortOrder: 4 },
    { type: "beach", name: "Salt Pond Bay", subtitle: "Remote / excellent snorkeling", distanceFromVilla: "20 min drive", notes: "20-min hike to Ram Head from here. Sea turtles, few crowds.", sortOrder: 5 },
    // Boats
    { type: "boat", name: "Ocean Runner Powerboat Rentals", subtitle: "Self-drive powerboat", priceTier: "$$$", distanceFromVilla: "7 min drive (Cruz Bay)", notes: "No captain needed — rent a powerboat and explore on your own.", sortOrder: 1 },
    { type: "boat", name: "Wharfside Watersports", subtitle: "Kayaks, paddleboards, snorkel gear", priceTier: "$$", distanceFromVilla: "7 min drive (Cruz Bay)", notes: "Gear rentals, snorkel tours, SUP lessons.", sortOrder: 2 },
    { type: "boat", name: "Palm Tree Charters", subtitle: "Full-day sailing charter", priceTier: "$$$", distanceFromVilla: "7 min drive (Cruz Bay)", notes: "Full-day sail with snorkeling stops, lunch, open bar.", sortOrder: 3 },
    // Coffee
    { type: "coffee", name: "Sun Dog Café", subtitle: "Best coffee in Cruz Bay", priceTier: "$", distanceFromVilla: "7 min drive", notes: "Espresso drinks, smoothies, good wifi.", sortOrder: 1 },
    { type: "coffee", name: "Extra Virgin Bistro", subtitle: "Café / Breakfast", priceTier: "$", distanceFromVilla: "7 min drive", notes: "Strong coffee, good breakfast wraps.", sortOrder: 2 },
    // Grocery
    { type: "grocery", name: "St. John Market (above Cruz Bay)", subtitle: "Full-service grocery", distanceFromVilla: "7 min drive", notes: "Best selection on the island. Upstairs from the harbor area.", sortOrder: 1 },
    { type: "grocery", name: "Starfish Market", subtitle: "Full-service grocery", distanceFromVilla: "7 min drive", notes: "Good produce, wine, deli. Popular with villa renters.", sortOrder: 2 },
    { type: "grocery", name: "Cruz Bay Liquor", subtitle: "Liquor store", distanceFromVilla: "7 min drive", notes: "Rum selection, mixers, wine. Stock up here.", sortOrder: 3 },
  ];

  await db.insert(guideEntries).values(guideRows.map(withExtras));

  // Contacts
  await db.insert(contacts).values([
    { category: "emergency", name: "USVI Police / Fire / EMS", phone: "911", notes: "Emergency services.", sortOrder: 1 },
    { category: "emergency", name: "USVI Non-Emergency Police", phone: "(340) 776-6272", notes: "St. John substation.", sortOrder: 2 },
    { category: "hospital", name: "Myrah Keating Smith Community Health Center", phone: "(340) 693-8900", address: "Susannaberg, St. John", notes: "Closest full medical facility. 15 min from Cruz Bay.", sortOrder: 1 },
    { category: "urgent_care", name: "Island Health & Wellness Center", phone: "(340) 714-4270", address: "Greenleaf Commons, above St. John Market, near Cruz Bay", notes: "Appointment only, flat $50/visit.", sortOrder: 1 },
    { category: "urgent_care", name: "Cruz Bay Family Practice", phone: "(340) 776-6789", address: "Cruz Bay", notes: "Dr. James Clayton; call ahead for urgent same-day issues.", sortOrder: 2 },
    { category: "pharmacy", name: "Chelsea Drug Store", phone: "(340) 776-4888", address: "The Marketplace, Cruz Bay", notes: "Full-service pharmacy; call ahead for specific medications.", sortOrder: 1 },
    { category: "taxi", name: "Paradise Taxi Association", phone: "(340) 714-7913", notes: "Dispatch, 7am-1am daily.", sortOrder: 1 },
    { category: "taxi", name: "Owen (Coral Bay taxi / island tours)", phone: "(340) 626-6274", notes: "Call or text; good for Coral Bay pickups.", sortOrder: 2 },
    { category: "taxi", name: "Dolphin Water Taxi", phone: "(340) 774-2628", notes: "Water transport to St. Thomas / BVI.", sortOrder: 3 },
    { category: "other", name: "VI Taxi Commission (rates/info)", phone: "(340) 693-4211", notes: "Reference for official taxi rates.", sortOrder: 1 },
    { category: "host", name: "Property Host / Property Manager", phone: "", notes: "Add the host's direct contact once confirmed for check-in coordination.", sortOrder: 1 },
  ]);

  // Weekend itinerary
  await db.insert(itineraryItems).values([
    { dayLabel: "Day 1 — Arrival", time: "Afternoon", title: "Check in at Terrapin Station", description: "Settle in, claim rooms, first look at that pool.", category: "arrival", sortOrder: 1 },
    { dayLabel: "Day 1 — Arrival", time: "Evening", title: "Dinner at Cruz Bay Landing", description: "Easy first-night dinner, right by the ferry dock.", category: "food", sortOrder: 2 },
    { dayLabel: "Day 2", time: "Morning", title: "Chocolate Hole Beach", description: "Ease in close to home — 3 minutes from the villa.", category: "beach", sortOrder: 3 },
    { dayLabel: "Day 2", time: "Afternoon", title: "Boat charter or Trunk Bay", description: "Pick one: powerboat rental from Cruz Bay, or the famous snorkel trail at Trunk Bay.", category: "activity", sortOrder: 4 },
    { dayLabel: "Day 2", time: "Evening", title: "Jordan's birthday dinner — Shambles", description: "The nicest dinner of the trip, closest fine dining to the villa.", category: "food", sortOrder: 5 },
    { dayLabel: "Day 3", time: "Morning", title: "Reef Bay Trail hike", description: "Plantation ruins and coastal views, half day.", category: "activity", sortOrder: 6 },
    { dayLabel: "Day 3", time: "Afternoon", title: "Lime Out floating taco bar", description: "Boat or water-taxi out near Coral Bay.", category: "food", sortOrder: 7 },
    { dayLabel: "Day 3", time: "Evening", title: "Bars in Cruz Bay", description: "The Longboard or High Tide for sunset drinks.", category: "activity", sortOrder: 8 },
    { dayLabel: "Final Day", time: "Morning", title: "Pack up + last swim", description: "Squeeze in one more pool session before checkout.", category: "general", sortOrder: 9 },
    { dayLabel: "Final Day", time: "Afternoon", title: "Departure", description: "Head to the ferry / airport — check everyone's flight times on the Travel page.", category: "arrival", sortOrder: 10 },
  ]);

  // eslint-disable-next-line no-console
  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
