import { Router, type IRouter } from "express";
import { eq, asc } from "drizzle-orm";
import { db, guideEntries, contacts, settings } from "@workspace/db";

const router: IRouter = Router();

// ---- Guide entries ----
router.get("/guide", async (req, res): Promise<void> => {
  const rows = await db.select().from(guideEntries).orderBy(asc(guideEntries.sortOrder));
  const { type } = req.query;
  res.json(type ? rows.filter((r) => r.type === type) : rows);
});

router.post("/guide", async (req, res): Promise<void> => {
  const [row] = await db.insert(guideEntries).values(req.body).returning();
  res.json(row);
});

router.patch("/guide/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [row] = await db
    .update(guideEntries)
    .set(req.body)
    .where(eq(guideEntries.id, id))
    .returning();
  res.json(row);
});

router.delete("/guide/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(guideEntries).where(eq(guideEntries.id, id));
  res.json({ ok: true });
});

// ---- Contacts ----
router.get("/contacts", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(contacts)
    .orderBy(asc(contacts.category), asc(contacts.sortOrder));
  res.json(rows);
});

router.post("/contacts", async (req, res): Promise<void> => {
  const [row] = await db.insert(contacts).values(req.body).returning();
  res.json(row);
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [row] = await db
    .update(contacts)
    .set(req.body)
    .where(eq(contacts.id, id))
    .returning();
  res.json(row);
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(contacts).where(eq(contacts.id, id));
  res.json({ ok: true });
});

// ---- Settings ----
router.get("/settings", async (_req, res): Promise<void> => {
  const rows = await db.select().from(settings);
  res.json(Object.fromEntries(rows.map((r) => [r.key, r.value])));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const entries = Object.entries(req.body as Record<string, string>);
  for (const [key, value] of entries) {
    await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
  res.json({ ok: true });
});

export default router;
