import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, households, guests, rooms } from "@workspace/db";
import {
  CreateHouseholdBody,
  UpdateHouseholdParams,
  UpdateHouseholdBody,
  DeleteHouseholdParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/households", async (_req, res): Promise<void> => {
  const rows = await db.select().from(households).orderBy(asc(households.sortOrder));
  res.json(rows);
});

router.post("/households", async (req, res): Promise<void> => {
  const parsed = CreateHouseholdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db.insert(households).values(parsed.data).returning();
  res.json(row);
});

router.patch("/households/:id", async (req, res): Promise<void> => {
  const params = UpdateHouseholdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateHouseholdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [row] = await db
    .update(households)
    .set(parsed.data)
    .where(eq(households.id, params.data.id))
    .returning();
  res.json(row);
});

router.delete("/households/:id", async (req, res): Promise<void> => {
  const params = DeleteHouseholdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(households).where(eq(households.id, params.data.id));
  res.json({ ok: true });
});

// ---- Guests ----
router.get("/guests", async (_req, res): Promise<void> => {
  const rows = await db.select().from(guests).orderBy(asc(guests.arrivalDatetime));
  res.json(rows);
});

router.post("/guests", async (req, res): Promise<void> => {
  const [row] = await db.insert(guests).values(req.body).returning();
  res.json(row);
});

router.patch("/guests/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [row] = await db
    .update(guests)
    .set(req.body)
    .where(eq(guests.id, id))
    .returning();
  res.json(row);
});

router.delete("/guests/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(guests).where(eq(guests.id, id));
  res.json({ ok: true });
});

// ---- Rooms ----
router.get("/rooms", async (_req, res): Promise<void> => {
  const rows = await db.select().from(rooms).orderBy(asc(rooms.sortOrder));
  res.json(rows);
});

router.patch("/rooms/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [row] = await db
    .update(rooms)
    .set(req.body)
    .where(eq(rooms.id, id))
    .returning();
  res.json(row);
});

export default router;
