import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, itineraryItems } from "@workspace/db";

const router: IRouter = Router();

router.get("/itinerary", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(itineraryItems)
    .orderBy(asc(itineraryItems.sortOrder));
  res.json(rows);
});

router.post("/itinerary", async (req, res): Promise<void> => {
  const [row] = await db.insert(itineraryItems).values(req.body).returning();
  res.json(row);
});

router.patch("/itinerary/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [row] = await db
    .update(itineraryItems)
    .set(req.body)
    .where(eq(itineraryItems.id, id))
    .returning();
  res.json(row);
});

router.delete("/itinerary/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(itineraryItems).where(eq(itineraryItems.id, id));
  res.json({ ok: true });
});

export default router;
