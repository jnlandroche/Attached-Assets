import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListBalances,
  useListExpenses,
  useListSettlementRecommendations,
  useUpdateSettlement,
  useCreateSettlement,
  useListHouseholds,
  useDeleteExpense,
  getListExpensesQueryKey,
  getListBalancesQueryKey,
  getListSettlementRecommendationsQueryKey,
} from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  Home as HomeIcon,
  Compass,
  Utensils,
  Tag,
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Trash2,
  X,
  Receipt,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { AddExpenseDrawer } from "@/components/AddExpenseDrawer";
import { toast } from "sonner";

const ease = [0.22, 1, 0.36, 1] as const;

// ── Category config ──────────────────────────────────────────────────────────
const CATS = {
  lodging: {
    label: "Lodging",
    icon: HomeIcon,
    bg: "bg-ink-900",
    text: "text-white",
    lightBg: "bg-ink-50",
    lightText: "text-ink-800",
    dot: "bg-ink-900",
    border: "border-ink-200",
  },
  trips_entertainment: {
    label: "Trips & Entertainment",
    icon: Compass,
    bg: "bg-lagoon-600",
    text: "text-white",
    lightBg: "bg-lagoon-50",
    lightText: "text-lagoon-700",
    dot: "bg-lagoon-600",
    border: "border-lagoon-200",
  },
  food_beverage: {
    label: "Food & Beverage",
    icon: Utensils,
    bg: "bg-papaya-500",
    text: "text-white",
    lightBg: "bg-papaya-50",
    lightText: "text-papaya-700",
    dot: "bg-papaya-500",
    border: "border-papaya-200",
  },
  other: {
    label: "Other",
    icon: Tag,
    bg: "bg-brass-500",
    text: "text-white",
    lightBg: "bg-brass-50",
    lightText: "text-brass-700",
    dot: "bg-brass-500",
    border: "border-brass-200",
  },
} as const;

type CatKey = keyof typeof CATS;

function normalizeCategory(cat: string): CatKey {
  const c = (cat || "").toLowerCase();
  if (["lodging", "accommodation", "vrbo", "airbnb", "rental", "villa"].includes(c)) return "lodging";
  if (["trips_entertainment", "activities", "entertainment", "tours", "transport",
       "boat", "ferry", "excursion", "snorkel", "diving", "trip"].includes(c)) return "trips_entertainment";
  if (["food_beverage", "food", "groceries", "dining", "restaurant", "drinks",
       "bar", "grocery", "f&b", "beverages", "coffee"].includes(c)) return "food_beverage";
  return "other";
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "lodging", label: "Lodging" },
  { key: "trips_entertainment", label: "Trips" },
  { key: "food_beverage", label: "Food" },
  { key: "other", label: "Other" },
] as const;

// ── Receipt lightbox ─────────────────────────────────────────────────────────
function ReceiptLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white tap"
      >
        <X className="w-7 h-7" />
      </button>
      <motion.img
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        src={url}
        className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </motion.div>
  );
}

// ── Expense card ─────────────────────────────────────────────────────────────
function ExpenseCard({
  expense,
  households,
  onDelete,
}: {
  expense: any;
  households: any[];
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const cat = normalizeCategory(expense.category);
  const config = CATS[cat];
  const CatIcon = config.icon;
  const paidBy = households.find((h) => h.id === expense.paidByHouseholdId);

  const shares: { householdId: number; shareAmount: number }[] = expense.shares || [];
  const amount = Number(expense.totalAmount);

  // If no explicit shares stored, compute equal split
  const effectiveShares = shares.length > 0
    ? shares
    : (expense.participantHouseholdIds || households.map((h: any) => h.id)).map((id: number) => ({
        householdId: id,
        shareAmount: amount / ((expense.participantHouseholdIds?.length || households.length) || 1),
      }));

  const dateStr = expense.date
    ? format(parseISO(expense.date), "MMM d")
    : "";

  return (
    <>
      <AnimatePresence>
        {lightboxUrl && (
          <ReceiptLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
        )}
      </AnimatePresence>

      <motion.div
        layout
        className="bg-white rounded-3xl shadow-card overflow-hidden"
      >
        {/* Main row */}
        <button
          type="button"
          className="w-full text-left p-5"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <CatIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-ink-950 leading-snug">
                  {expense.merchant || expense.description}
                </p>
                {expense.merchant && (
                  <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{expense.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${config.lightText} ${config.lightBg} px-2 py-0.5 rounded-full`}>
                    {config.label}
                  </span>
                  {dateStr && (
                    <span className="text-[11px] text-ink-400">{dateStr}</span>
                  )}
                  {paidBy && (
                    <span className="text-[11px] text-ink-500">
                      Paid by <span className="font-semibold text-ink-700">{paidBy.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="font-display text-2xl font-medium text-ink-950">
                ${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              {expanded ? (
                <ChevronUp className="w-4 h-4 text-ink-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-ink-400" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded detail */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 space-y-4 border-t border-sand-100 pt-4">
                {/* Receipt */}
                {expense.receiptUrl && (
                  <div>
                    <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-2">Receipt</p>
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(expense.receiptUrl)}
                      className="relative group"
                    >
                      <img
                        src={expense.receiptUrl}
                        alt="Receipt"
                        className="h-28 w-auto rounded-xl object-cover shadow-sm border border-sand-200 group-hover:opacity-90 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Receipt className="w-6 h-6 text-white drop-shadow" />
                      </div>
                    </button>
                  </div>
                )}

                {/* Per-household split */}
                <div>
                  <p className="text-[10px] font-bold text-ink-400 uppercase tracking-widest mb-2.5">Split</p>
                  <div className="space-y-2">
                    {effectiveShares.map((s: any) => {
                      const hh = households.find((h) => h.id === s.householdId);
                      if (!hh) return null;
                      const isPayer = hh.id === expense.paidByHouseholdId;
                      return (
                        <div key={s.householdId} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isPayer ? (
                              <CheckCircle2 className="w-4 h-4 text-lagoon-600 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-ink-300 shrink-0" />
                            )}
                            <span className={`text-[13px] font-medium ${isPayer ? "text-ink-800" : "text-ink-600"}`}>
                              {hh.name}
                            </span>
                            {isPayer && (
                              <span className="text-[10px] bg-lagoon-50 text-lagoon-600 font-bold px-1.5 py-0.5 rounded-full uppercase">
                                paid
                              </span>
                            )}
                          </div>
                          <span className={`text-[13px] font-bold tabular-nums ${isPayer ? "text-lagoon-600" : "text-ink-700"}`}>
                            ${Number(s.shareAmount).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delete */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onDelete(expense.id)}
                    className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-500 transition-colors font-medium"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete expense
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Money() {
  const { data: balances = [], isLoading: loadingB } = useListBalances();
  const { data: rawExpenses = [], isLoading: loadingE } = useListExpenses();
  const { data: recommendationsData, isLoading: loadingR } = useListSettlementRecommendations();
  const { data: households = [] } = useListHouseholds();

  const updateSettlement = useUpdateSettlement();
  const createSettlement = useCreateSettlement();
  const deleteExpense = useDeleteExpense();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | CatKey>("all");

  const recommendations = recommendationsData?.recommendations || [];
  const pending = recommendationsData?.pending || [];

  const expenses = rawExpenses as any[];

  if (loadingB || loadingE || loadingR) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-sand-200/50 animate-pulse rounded-3xl" />
        ))}
      </div>
    );
  }

  // ── Aggregations ────────────────────────────────────────────────────────
  const grandTotal = expenses.reduce((s: number, e: any) => s + Number(e.totalAmount), 0);
  const numHouseholds = households.length || 1;
  const perHousehold = grandTotal / numHouseholds;

  const catTotals: Record<CatKey, { total: number; count: number }> = {
    lodging: { total: 0, count: 0 },
    trips_entertainment: { total: 0, count: 0 },
    food_beverage: { total: 0, count: 0 },
    other: { total: 0, count: 0 },
  };
  for (const e of expenses) {
    const cat = normalizeCategory(e.category);
    catTotals[cat].total += Number(e.totalAmount);
    catTotals[cat].count += 1;
  }

  // ── Filtered list ────────────────────────────────────────────────────────
  const filtered = expenses.filter((e: any) =>
    activeFilter === "all" ? true : normalizeCategory(e.category) === activeFilter
  );
  const sorted = [...filtered].sort((a: any, b: any) =>
    (a.date || "") < (b.date || "") ? 1 : -1
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleMarkPaid = (rec: any) => {
    const existing = pending.find(
      (p: any) => p.fromHouseholdId === rec.fromHouseholdId && p.toHouseholdId === rec.toHouseholdId
    );
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
      queryClient.invalidateQueries({ queryKey: getListBalancesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListSettlementRecommendationsQueryKey() });
      toast.success("Marked as paid ✓");
    };
    if (existing) {
      updateSettlement.mutate({ id: existing.id, data: { status: "paid" } }, { onSuccess: invalidate });
    } else {
      createSettlement.mutate(
        {
          data: {
            fromHouseholdId: rec.fromHouseholdId,
            toHouseholdId: rec.toHouseholdId,
            amount: rec.amount.toString(),
            status: "paid",
          },
        },
        { onSuccess: invalidate }
      );
    }
  };

  const handleDelete = (id: number) => {
    deleteExpense.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListBalancesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSettlementRecommendationsQueryKey() });
        toast.success("Expense deleted");
      },
    });
  };

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      <PageHeader eyebrow="Shared Expenses" title="The Kitty" subtitle="Every dollar, accounted for." />

      <div className="px-5 space-y-6">

        {/* ── Grand total card ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="bg-gradient-to-br from-ink-900 to-ink-950 rounded-3xl p-6 shadow-card relative overflow-hidden"
        >
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/[0.04] blur-2xl pointer-events-none" />
          <div className="absolute -left-8 -bottom-8 w-32 h-32 rounded-full bg-lagoon-600/10 blur-xl pointer-events-none" />

          <p className="text-[10px] font-bold text-white/40 tracking-[0.2em] uppercase mb-1">Trip Total</p>
          <div className="flex items-end justify-between">
            <span className="font-display text-[3.2rem] font-medium text-white leading-none">
              ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <div className="text-right pb-1">
              <p className="text-xs text-white/40">Per household</p>
              <p className="text-lg font-bold text-white/80">
                ${perHousehold.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Balance pills */}
          {(balances as any[]).length > 0 && (
            <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
              {(balances as any[]).map((b) => (
                <div key={b.householdId} className="flex justify-between items-center bg-white/[0.07] rounded-xl px-3 py-2">
                  <span className="text-[11px] font-medium text-white/60 truncate mr-2">{b.householdName}</span>
                  <span className={`text-[12px] font-bold tabular-nums shrink-0 ${Number(b.netBalance) >= 0 ? "text-lagoon-400" : "text-papaya-400"}`}>
                    {Number(b.netBalance) >= 0 ? "+" : ""}${Math.abs(Number(b.netBalance)).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ── Category breakdown ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {(["lodging", "trips_entertainment", "food_beverage"] as CatKey[]).map((cat, i) => {
            const cfg = CATS[cat];
            const CatIcon = cfg.icon;
            const { total, count } = catTotals[cat];
            return (
              <motion.button
                key={cat}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07, duration: 0.35, ease }}
                onClick={() => setActiveFilter(activeFilter === cat ? "all" : cat)}
                className={`rounded-2xl p-3.5 shadow-card text-left transition-all tap ${
                  activeFilter === cat
                    ? `${cfg.bg} ${cfg.text}`
                    : "bg-white"
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 ${
                  activeFilter === cat ? "bg-white/20" : cfg.lightBg
                }`}>
                  <CatIcon className={`w-4 h-4 ${activeFilter === cat ? "text-white" : cfg.lightText}`} />
                </div>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${
                  activeFilter === cat ? "text-white/70" : "text-ink-400"
                }`}>
                  {cat === "trips_entertainment" ? "Trips" : cat === "food_beverage" ? "Food" : cfg.label}
                </p>
                <p className={`font-display text-lg font-medium leading-none ${
                  activeFilter === cat ? "text-white" : "text-ink-950"
                }`}>
                  ${total.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </p>
                <p className={`text-[10px] mt-0.5 ${activeFilter === cat ? "text-white/50" : "text-ink-400"}`}>
                  {count} {count === 1 ? "item" : "items"}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5 -mx-5 px-5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setActiveFilter(f.key as any)}
              className={`shrink-0 px-4 py-2 rounded-full text-[12px] font-bold transition-all tap ${
                activeFilter === f.key
                  ? "bg-ink-950 text-white shadow-sm"
                  : "bg-white text-ink-600 shadow-sm"
              }`}
            >
              {f.label}
              {f.key !== "all" && catTotals[f.key as CatKey].count > 0 && (
                <span className={`ml-1.5 text-[10px] ${activeFilter === f.key ? "text-white/50" : "text-ink-400"}`}>
                  {catTotals[f.key as CatKey].count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Expense list ── */}
        <div className="space-y-3">
          {sorted.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 shadow-card text-center">
              <Receipt className="w-10 h-10 text-ink-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-ink-500">No expenses yet</p>
              <p className="text-xs text-ink-400 mt-1">Tap + to log the first one</p>
            </div>
          ) : (
            sorted.map((e: any) => (
              <ExpenseCard
                key={e.id}
                expense={e}
                households={households as any[]}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>

        {/* ── Who owes whom ── */}
        {recommendations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease }}
            className="bg-white rounded-3xl shadow-card overflow-hidden"
          >
            <div className="px-5 pt-5 pb-4 border-b border-sand-100">
              <p className="text-[10px] font-bold text-ink-400 tracking-[0.18em] uppercase mb-0.5">Settle up</p>
              <h2 className="font-display text-xl font-medium text-ink-950">Who owes whom</h2>
            </div>
            <div className="divide-y divide-sand-50">
              {(recommendations as any[]).map((rec, i) => {
                const from = (households as any[]).find((h) => h.id === rec.fromHouseholdId);
                const to = (households as any[]).find((h) => h.id === rec.toHouseholdId);
                const isPaid = rec.status === "paid";
                return (
                  <div key={i} className={`px-5 py-4 flex items-center gap-3 ${isPaid ? "opacity-40" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-semibold text-ink-900">{from?.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-ink-400 shrink-0" />
                        <span className="text-[13px] font-semibold text-ink-900">{to?.name}</span>
                      </div>
                      <p className="text-xs text-ink-400 mt-0.5">Venmo or cash</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-display text-xl font-medium text-ink-950">
                        ${Number(rec.amount).toFixed(0)}
                      </span>
                      {isPaid ? (
                        <CheckCircle2 className="w-7 h-7 text-lagoon-500" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleMarkPaid(rec)}
                          className="bg-lagoon-600 text-white text-[11px] font-bold px-3 py-2 rounded-xl tap"
                        >
                          Mark paid
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

      </div>

      {/* ── FAB ── */}
      <motion.button
        type="button"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.35, ease }}
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 bg-lagoon-600 rounded-full shadow-[0_8px_30px_rgba(0,121,148,0.45)] flex items-center justify-center tap z-40"
      >
        <Plus className="w-6 h-6 text-white" />
      </motion.button>

      <AddExpenseDrawer open={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
}
