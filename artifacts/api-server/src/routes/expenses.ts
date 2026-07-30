import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { eq, desc } from "drizzle-orm";
import { db, expenses, expenseShares, settlements, households } from "@workspace/db";

const router: IRouter = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `receipt-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 8 * 1024 * 1024 } });

router.post("/upload/receipt", upload.single("receipt"), (req, res): void => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  res.json({ url: `/api/uploads/${req.file.filename}` });
});

router.post("/expenses", async (req, res): Promise<void> => {
  const { shares, participantHouseholdIds, ...expenseData } = req.body;

  const [expense] = await db
    .insert(expenses)
    .values({
      ...expenseData,
      participantHouseholdIds: JSON.stringify(participantHouseholdIds ?? []),
    })
    .returning();

  if (Array.isArray(shares) && shares.length > 0) {
    await db.insert(expenseShares).values(
      shares.map((s: { householdId: number; shareAmount: number }) => ({
        expenseId: expense.id,
        householdId: s.householdId,
        shareAmount: String(s.shareAmount),
      }))
    );
  }

  res.json(expense);
});

router.get("/expenses", async (_req, res): Promise<void> => {
  const rows = await db.select().from(expenses).orderBy(desc(expenses.date));
  const allShares = await db.select().from(expenseShares);
  const sharesByExpense: Record<number, typeof allShares> = {};
  for (const s of allShares) {
    sharesByExpense[s.expenseId] ??= [];
    sharesByExpense[s.expenseId].push(s);
  }
  res.json(
    rows.map((r) => ({
      ...r,
      participantHouseholdIds: r.participantHouseholdIds
        ? JSON.parse(r.participantHouseholdIds)
        : [],
      shares: (sharesByExpense[r.id] ?? []).map((s) => ({
        householdId: s.householdId,
        shareAmount: Number(s.shareAmount),
      })),
    }))
  );
});

router.patch("/expenses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { shares, participantHouseholdIds, ...expenseData } = req.body;

  const updateData: Record<string, unknown> = { ...expenseData };
  if (participantHouseholdIds !== undefined) {
    updateData.participantHouseholdIds = JSON.stringify(participantHouseholdIds);
  }

  const [expense] = await db
    .update(expenses)
    .set(updateData)
    .where(eq(expenses.id, id))
    .returning();

  if (Array.isArray(shares)) {
    await db.delete(expenseShares).where(eq(expenseShares.expenseId, id));
    if (shares.length > 0) {
      await db.insert(expenseShares).values(
        shares.map((s: { householdId: number; shareAmount: number }) => ({
          expenseId: id,
          householdId: s.householdId,
          shareAmount: String(s.shareAmount),
        }))
      );
    }
  }

  res.json(expense);
});

router.delete("/expenses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(expenses).where(eq(expenses.id, id));
  res.json({ ok: true });
});

// -----------------------------------------------------------------------
// Balances + minimum-transaction settlement recommendations
// -----------------------------------------------------------------------
async function computeBalances() {
  const hh = await db.select().from(households);
  const allShares = await db.select().from(expenseShares);
  const allExpenses = await db.select().from(expenses);
  const allSettlements = await db
    .select()
    .from(settlements)
    .where(eq(settlements.status, "paid"));

  const totals: Record<number, { paid: number; share: number }> = {};
  for (const h of hh) {
    totals[h.id] = { paid: 0, share: 0 };
  }

  for (const e of allExpenses) {
    if (e.paidByHouseholdId && totals[e.paidByHouseholdId]) {
      totals[e.paidByHouseholdId].paid += Number(e.totalAmount);
    }
  }

  for (const s of allShares) {
    if (totals[s.householdId]) {
      totals[s.householdId].share += Number(s.shareAmount);
    }
  }

  // Apply paid settlements: fromHousehold paid toHousehold, reduces from's debt
  for (const s of allSettlements) {
    const amount = Number(s.amount);
    // from paid to, so from gets credit (reduce share effectively)
    if (totals[s.fromHouseholdId]) totals[s.fromHouseholdId].paid += amount;
    if (totals[s.toHouseholdId]) totals[s.toHouseholdId].paid -= amount;
  }

  const balances = hh.map((h) => ({
    householdId: h.id,
    householdName: h.name,
    totalPaid: totals[h.id]?.paid ?? 0,
    totalShare: totals[h.id]?.share ?? 0,
    netBalance: (totals[h.id]?.paid ?? 0) - (totals[h.id]?.share ?? 0),
  }));

  const net = hh.map((h) => ({
    id: h.id,
    name: h.name,
    amount: (totals[h.id]?.paid ?? 0) - (totals[h.id]?.share ?? 0),
  }));

  return { hh, net, balances };
}

function minimumTransactions(
  net: { id: number; name: string; amount: number }[],
  _nameById: Record<number, string>
) {
  const creditors = net
    .filter((n) => n.amount > 0.005)
    .map((n) => ({ ...n }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = net
    .filter((n) => n.amount < -0.005)
    .map((n) => ({ ...n, amount: -n.amount }))
    .sort((a, b) => b.amount - a.amount);

  const recs: {
    fromHouseholdId: number;
    fromName: string;
    toHouseholdId: number;
    toName: string;
    amount: number;
  }[] = [];

  let ci = 0;
  let di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);
    recs.push({
      fromHouseholdId: d.id,
      fromName: d.name,
      toHouseholdId: c.id,
      toName: c.name,
      amount: Math.round(amount * 100) / 100,
    });
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount < 0.005) ci++;
    if (d.amount < 0.005) di++;
  }
  return recs;
}

router.get("/balances", async (_req, res): Promise<void> => {
  const { balances } = await computeBalances();
  res.json(balances);
});

router.get("/settlements/recommendations", async (_req, res): Promise<void> => {
  const { hh, net } = await computeBalances();
  const nameById = Object.fromEntries(hh.map((h) => [h.id, h.name]));
  const recs = minimumTransactions(net, nameById);
  const pending = await db
    .select()
    .from(settlements)
    .where(eq(settlements.status, "pending"));
  res.json({ recommendations: recs, pending });
});

router.get("/settlements", async (_req, res): Promise<void> => {
  const rows = await db.select().from(settlements).orderBy(desc(settlements.createdAt));
  res.json(rows);
});

router.post("/settlements", async (req, res): Promise<void> => {
  const [row] = await db
    .insert(settlements)
    .values({ ...req.body, status: "pending" })
    .returning();
  res.json(row);
});

router.patch("/settlements/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status } = req.body;
  const [row] = await db
    .update(settlements)
    .set({ status, paidAt: status === "paid" ? new Date() : null })
    .where(eq(settlements.id, id))
    .returning();
  res.json(row);
});

export default router;
