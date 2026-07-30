import { useState } from "react";
import { useCreateExpense, useListHouseholds, getListExpensesQueryKey, getListBalancesQueryKey, getListSettlementRecommendationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { format } from "date-fns";
import { Camera, Upload, X } from "lucide-react";
import { toast } from "sonner";

export function AddExpenseDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: households = [] } = useListHouseholds();
  const createExpense = useCreateExpense();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("groceries");
  const [paidBy, setPaidBy] = useState<number | "">("");
  const [allocationMethod, setAllocationMethod] = useState("equal_all");
  const [selectedHouseholds, setSelectedHouseholds] = useState<number[]>([]);
  const [customShares, setCustomShares] = useState<Record<number, string>>({});
  
  const [receiptUrl, setReceiptUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const res = await fetch(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/api/upload/receipt`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setReceiptUrl(data.url);
        toast.success("Receipt uploaded");
      }
    } catch (err) {
      toast.error("Failed to upload receipt");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description || !paidBy) return toast.error("Please fill all required fields");

    const totalAmount = parseFloat(amount);
    if (isNaN(totalAmount) || totalAmount <= 0) return toast.error("Invalid amount");

    let participants = selectedHouseholds;
    let shares: { householdId: number; shareAmount: number }[] = [];

    if (allocationMethod === "equal_all") {
      participants = households.map(h => h.id);
    } else if (allocationMethod === "single_payer") {
      participants = [Number(paidBy)];
    } else if (allocationMethod === "percentage" || allocationMethod === "fixed") {
      // Validate custom shares
      let sum = 0;
      for (const h of households) {
        if (customShares[h.id]) {
          let val = parseFloat(customShares[h.id]);
          if (allocationMethod === "percentage") {
            val = (val / 100) * totalAmount;
          }
          if (val > 0) {
            shares.push({ householdId: h.id, shareAmount: val });
            sum += val;
          }
        }
      }
      if (Math.abs(sum - totalAmount) > 0.05) {
        return toast.error(`Shares do not sum to total (${sum.toFixed(2)} vs ${totalAmount.toFixed(2)})`);
      }
    }

    createExpense.mutate({
      data: {
        description,
        totalAmount: totalAmount.toString(),
        category,
        paidByHouseholdId: Number(paidBy),
        allocationMethod,
        participantHouseholdIds: participants,
        shares: shares.length > 0 ? shares : undefined,
        date: format(new Date(), "yyyy-MM-dd"),
        receiptUrl: receiptUrl || null
      }
    }, {
      onSuccess: () => {
        toast.success("Expense added");
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListBalancesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListSettlementRecommendationsQueryKey() });
        onOpenChange(false);
        // Reset
        setAmount("");
        setDescription("");
        setReceiptUrl("");
        setCustomShares({});
      }
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className="px-2">
          <h2 className="font-display text-2xl text-ink-950 mb-6">Add Expense</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white rounded-2xl p-4 shadow-card">
              <label className="text-xs font-bold text-ink-500 uppercase block mb-1">Amount</label>
              <div className="flex items-center text-3xl font-display text-ink-950">
                <span className="text-ink-300 mr-1">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full outline-none bg-transparent" 
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Description</label>
                <input 
                  type="text"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600"
                  placeholder="What was this for?"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Paid By</label>
                  <select 
                    value={paidBy}
                    onChange={e => setPaidBy(Number(e.target.value))}
                    className="w-full bg-white border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600 appearance-none"
                    required
                  >
                    <option value="" disabled>Select...</option>
                    {households.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Split</label>
                  <select 
                    value={allocationMethod}
                    onChange={e => setAllocationMethod(e.target.value)}
                    className="w-full bg-white border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600 appearance-none"
                  >
                    <option value="equal_all">Equal All</option>
                    <option value="equal_selected">Equal Selected</option>
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amounts</option>
                    <option value="single_payer">No Split</option>
                  </select>
                </div>
              </div>

              {allocationMethod === 'equal_selected' && (
                <div className="bg-white p-3 rounded-xl shadow-sm border border-sand-200">
                  <label className="text-sm font-bold text-ink-900 block mb-2">Who is splitting this?</label>
                  <div className="flex flex-wrap gap-2">
                    {households.map(h => {
                      const isSelected = selectedHouseholds.includes(h.id);
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) setSelectedHouseholds(s => s.filter(id => id !== h.id));
                            else setSelectedHouseholds(s => [...s, h.id]);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            isSelected ? "bg-lagoon-600 text-white" : "bg-sand-100 text-ink-700"
                          }`}
                        >
                          {h.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(allocationMethod === 'percentage' || allocationMethod === 'fixed') && (
                <div className="bg-white p-3 rounded-xl shadow-sm border border-sand-200 space-y-2">
                  <label className="text-sm font-bold text-ink-900 block mb-2">Assign Shares</label>
                  {households.map(h => (
                    <div key={h.id} className="flex items-center gap-3">
                      <div className="w-1/2 text-sm font-medium text-ink-900">{h.name}</div>
                      <div className="w-1/2 flex items-center relative">
                        <span className="absolute left-3 text-ink-400 text-sm">
                          {allocationMethod === 'fixed' ? '$' : ''}
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={customShares[h.id] || ""}
                          onChange={e => setCustomShares({...customShares, [h.id]: e.target.value})}
                          placeholder="0"
                          className="w-full bg-sand-50 rounded-lg py-1.5 pl-7 pr-3 text-sm focus:ring-2 ring-lagoon-600 outline-none"
                        />
                        <span className="absolute right-3 text-ink-400 text-sm">
                          {allocationMethod === 'percentage' ? '%' : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1 mt-4">Receipt Image</label>
                {receiptUrl ? (
                  <div className="relative inline-block mt-1">
                    <img src={receiptUrl} className="h-24 w-auto rounded-xl shadow-sm border border-sand-200" alt="Receipt" />
                    <button type="button" onClick={() => setReceiptUrl("")} className="absolute -top-2 -right-2 bg-ink-950 text-white rounded-full p-1 shadow-sm">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="mt-1 flex items-center justify-center gap-2 bg-white border border-dashed border-sand-200 rounded-xl p-4 cursor-pointer hover:bg-sand-50 transition-colors">
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-lagoon-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Camera className="w-5 h-5 text-ink-400" />
                        <span className="text-sm font-bold text-ink-700">Upload Receipt</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            <button 
              type="submit" 
              disabled={createExpense.isPending}
              className="w-full bg-lagoon-600 text-white font-bold py-4 rounded-xl shadow-md tap mt-6 mb-8"
            >
              {createExpense.isPending ? "Adding..." : "Add Expense"}
            </button>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
