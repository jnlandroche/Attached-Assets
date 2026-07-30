import { useListBalances, useListExpenses, useListSettlementRecommendations, useUpdateSettlement, useCreateSettlement } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Receipt, Plus, ArrowRight, CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AddExpenseDrawer } from "@/components/AddExpenseDrawer";
import { toast } from "sonner";

const SKINS = [
  "bg-gradient-to-br from-ink-900 to-ink-950 text-white",
  "bg-gradient-to-br from-lagoon-500 to-lagoon-700 text-white",
  "bg-gradient-to-br from-papaya-500 to-papaya-600 text-white",
  "bg-gradient-to-br from-brass-500 to-brass-600 text-white",
];

export default function Money() {
  const { data: balances = [], isLoading: loadingB } = useListBalances();
  const { data: expenses = [], isLoading: loadingE } = useListExpenses();
  const { data: recommendationsData, isLoading: loadingR } = useListSettlementRecommendations();
  
  const recommendations = recommendationsData?.recommendations || [];
  const pending = recommendationsData?.pending || [];

  const updateSettlement = useUpdateSettlement();
  const createSettlement = useCreateSettlement();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);

  if (loadingB || loadingE || loadingR) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-40 bg-sand-200/50 animate-pulse rounded-3xl" />
        <div className="h-40 bg-sand-200/50 animate-pulse rounded-3xl" />
      </div>
    );
  }

  const handleMarkPaid = (rec: any) => {
    const existing = pending.find(p => p.fromHouseholdId === rec.fromHouseholdId && p.toHouseholdId === rec.toHouseholdId);
    if (existing) {
      updateSettlement.mutate({ id: existing.id, data: { status: 'paid' } }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
          queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
          queryClient.invalidateQueries({ queryKey: ["/api/settlements/recommendations"] });
          toast.success("Marked as paid");
        }
      });
    } else {
      createSettlement.mutate({
        data: {
          fromHouseholdId: rec.fromHouseholdId,
          toHouseholdId: rec.toHouseholdId,
          amount: rec.amount.toString(),
          status: 'paid'
        }
      }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/settlements"] });
          queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
          queryClient.invalidateQueries({ queryKey: ["/api/settlements/recommendations"] });
          toast.success("Marked as paid");
        }
      });
    }
  };

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <PageHeader eyebrow="Shared Expenses" title="The Kitty" subtitle="Who owes what to whom." />

      <div className="px-5 space-y-8">
        
        {/* Wallet Cards */}
        <div className="space-y-4">
          <div className="flex justify-between items-end mb-2 px-1">
            <h2 className="font-display text-xl text-ink-950">Balances</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {balances.map((b, idx) => {
              const skin = SKINS[idx % SKINS.length];
              return (
                <div key={b.householdId} className={`${skin} rounded-3xl p-6 shadow-card relative overflow-hidden`}>
                  {/* Decorative circles */}
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                  <div className="absolute -left-8 -bottom-8 w-24 h-24 rounded-full bg-black/10 blur-xl pointer-events-none" />
                  
                  <div className="relative z-10">
                    <h3 className="font-display text-2xl mb-4">{b.householdName}</h3>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs uppercase tracking-widest opacity-70 mb-1">Net Balance</p>
                        <div className="text-3xl font-bold">
                          {b.netBalance > 0 ? '+' : ''}${b.netBalance.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right opacity-80 text-sm">
                        <p>Paid: ${b.totalPaid.toFixed(2)}</p>
                        <p>Share: ${b.totalShare.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {balances.length === 0 && (
              <div className="text-center py-8 text-ink-900/40 border-2 border-dashed border-sand-200 rounded-3xl">No balances found.</div>
            )}
          </div>
        </div>

        {/* Settlement Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h2 className="font-display text-xl text-ink-950 mb-4 px-1">Settle Up</h2>
            <div className="bg-white rounded-3xl shadow-card p-5 space-y-4">
              {recommendations.map((rec, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-ink-900">{rec.fromName}</div>
                    <ArrowRight className="w-4 h-4 text-ink-300" />
                    <div className="font-bold text-ink-900">{rec.toName}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="font-display text-xl text-ink-950">${rec.amount.toFixed(2)}</div>
                    <button 
                      onClick={() => handleMarkPaid(rec)}
                      className="w-8 h-8 rounded-full bg-sand-100 flex items-center justify-center hover:bg-lagoon-600 hover:text-white transition-colors text-ink-400 tap"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Expenses List */}
        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="font-display text-xl text-ink-950">Recent Expenses</h2>
            <button 
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1 text-sm font-bold text-lagoon-600 tap bg-lagoon-600/10 px-3 py-1.5 rounded-full"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>
          
          <div className="space-y-3">
            {expenses.map(exp => (
              <div key={exp.id} className="bg-white rounded-2xl p-4 shadow-card flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-sand-100 flex items-center justify-center shrink-0 text-ink-700 overflow-hidden">
                  {exp.receiptUrl ? (
                    <img 
                      src={exp.receiptUrl}
                      alt="Receipt" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <Receipt className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-bold text-ink-950 truncate">{exp.description}</h3>
                    <div className="font-bold text-ink-950">${parseFloat(exp.totalAmount).toFixed(2)}</div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-ink-500">
                    <div>{format(parseISO(exp.date), 'MMM d')} • {exp.category}</div>
                    <div>Paid by House {exp.paidByHouseholdId}</div>
                  </div>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="text-center py-8 text-ink-900/40">No expenses recorded yet.</div>
            )}
          </div>
        </div>

      </div>

      <AddExpenseDrawer open={isAddOpen} onOpenChange={setIsAddOpen} />
    </div>
  );
}
