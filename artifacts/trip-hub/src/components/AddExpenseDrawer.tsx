import { useState, useRef } from "react";
import {
  useCreateExpense,
  useListHouseholds,
  getListExpensesQueryKey,
  getListBalancesQueryKey,
  getListSettlementRecommendationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { format } from "date-fns";
import { Camera, Sparkles, X, Home as HomeIcon, Compass, Utensils, Tag } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const CATEGORIES = [
  { value: "lodging", label: "Lodging", icon: HomeIcon, bg: "bg-ink-100", text: "text-ink-800" },
  { value: "trips_entertainment", label: "Trips & Entertainment", icon: Compass, bg: "bg-lagoon-50", text: "text-lagoon-700" },
  { value: "food_beverage", label: "Food & Beverage", icon: Utensils, bg: "bg-papaya-50", text: "text-papaya-700" },
  { value: "other", label: "Other", icon: Tag, bg: "bg-brass-50", text: "text-brass-700" },
] as const;

function reset(setters: Array<(v: any) => void>, defaults: any[]) {
  setters.forEach((s, i) => s(defaults[i]));
}

export function AddExpenseDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: households = [] } = useListHouseholds();
  const createExpense = useCreateExpense();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("food_beverage");
  const [paidBy, setPaidBy] = useState<number | "">("");
  const [allocationMethod, setAllocationMethod] = useState("equal_all");
  const [selectedHouseholds, setSelectedHouseholds] = useState<number[]>([]);
  const [customShares, setCustomShares] = useState<Record<number, string>>({});
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receiptUrl, setReceiptUrl] = useState("");

  // AI scan state
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const handleClose = () => {
    onOpenChange(false);
    // short delay before reset so animation plays
    setTimeout(() => {
      setAmount("");
      setMerchant("");
      setDescription("");
      setCategory("food_beverage");
      setPaidBy("");
      setAllocationMethod("equal_all");
      setSelectedHouseholds([]);
      setCustomShares({});
      setDate(format(new Date(), "yyyy-MM-dd"));
      setReceiptUrl("");
      setScanned(false);
    }, 300);
  };

  const handleScanReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    setScanning(true);
    setScanned(false);

    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const res = await fetch(`${BASE}/api/expenses/scan-receipt`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.receiptUrl) setReceiptUrl(data.receiptUrl);
      if (data.totalAmount && parseFloat(data.totalAmount) > 0) setAmount(data.totalAmount);
      if (data.merchant) setMerchant(data.merchant);
      if (data.description) setDescription(data.description);
      if (data.category) setCategory(data.category);
      if (data.date) setDate(data.date);

      if (data.scanError) {
        toast.error(data.scanError);
      } else {
        setScanned(true);
        toast.success("Receipt scanned! Check the details below.");
      }
    } catch {
      toast.error("Failed to scan receipt");
    } finally {
      setScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !paidBy) return toast.error("Amount, description, and paid-by are required");

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) return toast.error("Invalid amount");

    let participants = selectedHouseholds;
    let shares: { householdId: number; shareAmount: number }[] = [];

    if (allocationMethod === "equal_all") {
      participants = (households as any[]).map((h: any) => h.id);
    } else if (allocationMethod === "single_payer") {
      participants = [Number(paidBy)];
    } else if (allocationMethod === "percentage" || allocationMethod === "fixed") {
      let sum = 0;
      for (const h of households as any[]) {
        if (customShares[h.id]) {
          let val = parseFloat(customShares[h.id]);
          if (allocationMethod === "percentage") val = (val / 100) * totalAmount;
          if (val > 0) {
            shares.push({ householdId: h.id, shareAmount: val });
            sum += val;
          }
        }
      }
      if (Math.abs(sum - totalAmount) > 0.05) {
        return toast.error(`Shares must sum to total ($${totalAmount.toFixed(2)}), got $${sum.toFixed(2)}`);
      }
    }

    createExpense.mutate(
      {
        data: {
          description,
          merchant: merchant || null,
          totalAmount: totalAmount.toString(),
          category,
          paidByHouseholdId: Number(paidBy),
          allocationMethod,
          participantHouseholdIds: participants,
          shares: shares.length > 0 ? shares : undefined,
          date,
          receiptUrl: receiptUrl || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Expense added");
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListBalancesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListSettlementRecommendationsQueryKey() });
          handleClose();
        },
      }
    );
  };

  return (
    <Drawer open={open} onOpenChange={(v) => !v && handleClose()}>
      <DrawerContent>
        <div className="px-2 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-2xl text-ink-950">Add Expense</h2>
            <button type="button" onClick={handleClose} className="text-ink-400 tap p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── AI Scan Receipt ── */}
          <div className="mb-5">
            <input
              ref={scanInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScanReceipt}
            />
            <button
              type="button"
              onClick={() => scanInputRef.current?.click()}
              disabled={scanning}
              className={`w-full flex items-center justify-center gap-2.5 rounded-2xl py-3.5 font-bold text-sm transition-all tap shadow-sm ${
                scanned
                  ? "bg-lagoon-50 text-lagoon-700 border border-lagoon-200"
                  : "bg-gradient-to-r from-ink-900 to-ink-800 text-white"
              }`}
            >
              <AnimatePresence mode="wait">
                {scanning ? (
                  <motion.div
                    key="scanning"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2.5"
                  >
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Reading receipt…
                  </motion.div>
                ) : scanned ? (
                  <motion.div
                    key="scanned"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Receipt scanned — scan another?
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Scan Receipt with AI
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            {scanned && (
              <p className="text-center text-[11px] text-ink-400 mt-1.5">
                Fields below were auto-filled — review before saving
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Amount */}
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <label className="text-[10px] font-bold text-ink-400 uppercase tracking-widest block mb-1">
                Amount
              </label>
              <div className="flex items-center text-3xl font-display text-ink-950">
                <span className="text-ink-300 mr-1">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full outline-none bg-transparent"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Merchant + Description */}
            <div className="space-y-2.5">
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">
                  Merchant / Vendor
                </label>
                <input
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600"
                  placeholder="e.g. Woody's Seafood Saloon"
                />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">
                  Description <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600"
                  placeholder="e.g. Dinner — seafood & cocktails"
                  required
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-sm font-bold text-ink-900 block mb-2">Category</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((c) => {
                  const Icon = c.icon;
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-2 p-3 rounded-xl text-left text-sm font-semibold transition-all tap ${
                        active
                          ? "bg-ink-900 text-white shadow-sm"
                          : `${c.bg} ${c.text}`
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="leading-tight text-[12px]">{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paid by + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">
                  Paid By <span className="text-red-400">*</span>
                </label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(Number(e.target.value))}
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600 appearance-none"
                  required
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {(households as any[]).map((h: any) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600"
                />
              </div>
            </div>

            {/* Split */}
            <div>
              <label className="text-sm font-bold text-ink-900 block mb-1">Split</label>
              <select
                value={allocationMethod}
                onChange={(e) => setAllocationMethod(e.target.value)}
                className="w-full bg-white border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600 appearance-none"
              >
                <option value="equal_all">Equal — all households</option>
                <option value="equal_selected">Equal — selected households</option>
                <option value="percentage">Custom — percentage</option>
                <option value="fixed">Custom — fixed amounts</option>
                <option value="single_payer">No split (personal)</option>
              </select>
            </div>

            {allocationMethod === "equal_selected" && (
              <div className="bg-white p-3 rounded-xl shadow-sm">
                <label className="text-sm font-bold text-ink-900 block mb-2">Who's splitting this?</label>
                <div className="flex flex-wrap gap-2">
                  {(households as any[]).map((h: any) => {
                    const sel = selectedHouseholds.includes(h.id);
                    return (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() =>
                          sel
                            ? setSelectedHouseholds((s) => s.filter((id) => id !== h.id))
                            : setSelectedHouseholds((s) => [...s, h.id])
                        }
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          sel ? "bg-lagoon-600 text-white" : "bg-sand-100 text-ink-700"
                        }`}
                      >
                        {h.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {(allocationMethod === "percentage" || allocationMethod === "fixed") && (
              <div className="bg-white p-3 rounded-xl shadow-sm space-y-2">
                <label className="text-sm font-bold text-ink-900 block mb-1">Assign shares</label>
                {(households as any[]).map((h: any) => (
                  <div key={h.id} className="flex items-center gap-3">
                    <div className="w-1/2 text-sm font-medium text-ink-900">{h.name}</div>
                    <div className="w-1/2 flex items-center relative">
                      <span className="absolute left-3 text-ink-400 text-sm">
                        {allocationMethod === "fixed" ? "$" : ""}
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={customShares[h.id] || ""}
                        onChange={(e) =>
                          setCustomShares({ ...customShares, [h.id]: e.target.value })
                        }
                        placeholder="0"
                        className="w-full bg-sand-50 rounded-lg py-1.5 pl-7 pr-3 text-sm focus:ring-2 ring-lagoon-600 outline-none"
                      />
                      <span className="absolute right-3 text-ink-400 text-sm">
                        {allocationMethod === "percentage" ? "%" : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Receipt preview / upload */}
            <div>
              <label className="text-sm font-bold text-ink-900 block mb-2">Receipt</label>
              {receiptUrl ? (
                <div className="relative inline-block">
                  <img
                    src={receiptUrl}
                    className="h-28 w-auto rounded-xl shadow-sm border border-sand-200 object-cover"
                    alt="Receipt"
                  />
                  <button
                    type="button"
                    onClick={() => setReceiptUrl("")}
                    className="absolute -top-2 -right-2 bg-ink-950 text-white rounded-full p-1 shadow-sm"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 bg-white border border-dashed border-sand-300 rounded-xl p-4 cursor-pointer hover:bg-sand-50 transition-colors">
                  <Camera className="w-5 h-5 text-ink-400" />
                  <span className="text-sm font-bold text-ink-500">Attach photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const fd = new FormData();
                      fd.append("receipt", file);
                      try {
                        const r = await fetch(`${BASE}/api/upload/receipt`, { method: "POST", body: fd });
                        const d = await r.json();
                        if (d.url) setReceiptUrl(d.url);
                      } catch {
                        toast.error("Failed to attach photo");
                      }
                    }}
                  />
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={createExpense.isPending}
              className="w-full bg-lagoon-600 text-white font-bold py-4 rounded-xl shadow-md tap mt-2 mb-8"
            >
              {createExpense.isPending ? "Saving…" : "Save Expense"}
            </button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
