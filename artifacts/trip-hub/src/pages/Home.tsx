import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Wallet, Plane, Compass, Megaphone, ChevronRight, PartyPopper, PlaneLanding } from "lucide-react";
import {
  useGetSettings,
  useListBalances,
  useListGuests,
  useListHouseholds,
  useListExpenses,
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { HorizonWave } from "@/components/ui/HorizonWave";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  const { data: settingsData } = useGetSettings();
  const { data: balances = [] } = useListBalances();
  const { data: guests = [] } = useListGuests();
  const { data: households = [] } = useListHouseholds();
  const { data: expenses = [] } = useListExpenses();

  const settings: Record<string, string> = (settingsData as Record<string, string>) || {};

  const heroPhotos: string[] = settings.group_photos ? JSON.parse(settings.group_photos) : [];
  const birthdayPhotos: string[] = settings.birthday_photos ? JSON.parse(settings.birthday_photos) : [];

  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    if (heroPhotos.length < 2) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroPhotos.length), 5000);
    return () => clearInterval(t);
  }, [heroPhotos.length]);

  const checkIn = settings.check_in_date;
  const daysToGo = checkIn
    ? Math.ceil((new Date(checkIn).getTime() - Date.now()) / 86400000)
    : null;

  const totalSpent = balances.reduce((sum: number, b) => sum + Number(b.totalPaid ?? 0), 0);
  const targetBudget = settings.target_budget ? Number(settings.target_budget) : null;

  const householdName = (id: number) =>
    (households as { id: number; name: string }[]).find((h) => h.id === id)?.name ?? "";

  const upcomingArrivals = [...(guests as { arrivalDatetime?: string; name?: string; householdId?: number; arrivalFlightNumber?: string }[])]
    .filter((g) => g.arrivalDatetime && new Date(g.arrivalDatetime) > new Date())
    .sort((a, b) => (a.arrivalDatetime! < b.arrivalDatetime! ? -1 : 1))
    .slice(0, 3);

  const latestExpenses = [...(expenses as { id: number; date: string; description: string; category: string; totalAmount: string | number; paidByHouseholdId?: number }[])]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 3);

  const announcement = settings.announcement;

  return (
    <div className="pb-8">
      {/* ── HERO ── */}
      <div className="relative h-[68vh] min-h-[460px] overflow-hidden">
        {heroPhotos.length > 0 ? (
          heroPhotos.map((src, i) => (
            <motion.img
              key={src}
              src={src}
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: i === heroIndex ? 1 : 0, scale: i === heroIndex ? 1 : 1.08 }}
              transition={{ duration: 1.6, ease }}
            />
          ))
        ) : (
          <div className="absolute inset-0 bg-ink-950" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/25 to-ink-950/10" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/30 via-transparent to-transparent" />

        <div className="relative h-full flex flex-col justify-end px-6 pb-10">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease }}
            className="flex items-center gap-2 text-brass-400 text-[11px] font-bold tracking-[0.16em] uppercase mb-3"
          >
            <span className="h-px w-4 bg-brass-400 inline-block" />
            {settings.property_location || "Chocolate Hole, St. John, USVI"}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6, ease }}
            className="font-display text-[2.75rem] font-medium text-white leading-[0.98] tracking-tight max-w-[13ch]"
          >
            {settings.trip_title || "Jordan's 40th Birthday"}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease }}
            className="flex items-end gap-4 mt-7"
          >
            {daysToGo !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="font-display italic text-6xl text-white leading-none">
                  {daysToGo}
                </span>
                <span className="text-white/60 text-sm font-medium pb-1">
                  {daysToGo === 1 ? "day to go" : daysToGo <= 0 ? "we're here!" : "days to go"}
                </span>
              </div>
            ) : (
              <p className="text-white/50 text-sm">Dates TBD — check the Villa page</p>
            )}
            {settings.weather_summary && (
              <p className="text-white/50 text-xs pb-1.5 border-l border-white/20 pl-4 max-w-[16ch] leading-snug">
                {settings.weather_summary}
              </p>
            )}
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 translate-y-px">
          <HorizonWave />
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="px-5 pt-2 space-y-5">

        {/* Announcement */}
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <Card className="bg-ink-900 border-none text-white shadow-card">
              <CardContent className="p-4 flex items-start gap-3">
                <Megaphone className="h-5 w-5 text-brass-400 shrink-0 mt-0.5" />
                <p className="text-sm text-white/85 leading-relaxed">{announcement}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { to: "/money", icon: Wallet, label: "Add expense", bg: "bg-lagoon-600/10", fg: "text-lagoon-600" },
            { to: "/travel", icon: Plane, label: "My flight", bg: "bg-papaya-500/10", fg: "text-papaya-600" },
            { to: "/explore", icon: Compass, label: "Explore", bg: "bg-brass-500/10", fg: "text-brass-600" },
          ].map((a, i) => (
            <motion.div
              key={a.to}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.06, duration: 0.4, ease }}
            >
              <Link to={a.to}>
                <div className="bg-white rounded-2xl shadow-card p-4 flex flex-col items-center gap-2 text-center tap cursor-pointer">
                  <div className={`rounded-2xl p-2.5 ${a.bg}`}>
                    <a.icon className={`h-5 w-5 ${a.fg}`} />
                  </div>
                  <span className="text-[12px] font-semibold text-ink-900 leading-tight">{a.label}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Upcoming arrivals */}
        {upcomingArrivals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, ease }}
          >
            <Card className="shadow-card">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold text-ink-900/35 uppercase tracking-[0.1em]">
                    Upcoming arrivals
                  </p>
                  <Link to="/travel">
                    <span className="flex items-center gap-1 text-xs font-semibold text-lagoon-600 group">
                      All flights <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </div>
                <div className="space-y-3">
                  {upcomingArrivals.map((g) => (
                    <div key={g.arrivalDatetime} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-lagoon-600/10 flex items-center justify-center shrink-0">
                        <PlaneLanding className="w-4 h-4 text-lagoon-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ink-900 truncate">
                          {householdName(g.householdId!)}
                        </p>
                        <p className="text-xs text-ink-900/45">
                          {g.arrivalDatetime
                            ? new Date(g.arrivalDatetime).toLocaleDateString("en-US", {
                                weekday: "short", month: "short", day: "numeric",
                              })
                            : ""}
                          {g.arrivalFlightNumber ? ` · ${g.arrivalFlightNumber}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Money at a glance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, ease }}
        >
          <Card className="shadow-card">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-bold text-ink-900/35 uppercase tracking-[0.1em]">
                  Trip spend
                </p>
                <p className="font-display text-2xl text-ink-900">
                  ${totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>

              {targetBudget && (
                <div className="mb-4 mt-2">
                  <Progress
                    value={Math.min(100, (totalSpent / targetBudget) * 100)}
                    className="h-1.5"
                  />
                  <p className="text-xs text-ink-900/40 mt-1.5">
                    of ${targetBudget.toLocaleString()} planned
                  </p>
                </div>
              )}

              {(balances as { householdId: number; householdName: string; netBalance: number }[]).length > 0 && (
                <div className="space-y-2 mt-4">
                  {(balances as { householdId: number; householdName: string; netBalance: number }[]).map((b) => (
                    <div key={b.householdId} className="flex justify-between items-center text-sm">
                      <span className="font-medium text-ink-900">{b.householdName}</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          b.netBalance >= 0
                            ? "bg-lagoon-600/10 text-lagoon-600"
                            : "bg-papaya-500/10 text-papaya-600"
                        }`}
                      >
                        {b.netBalance >= 0 ? "+" : ""}${Number(b.netBalance).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {latestExpenses.length > 0 && (
                <div className="mt-4 pt-4 border-t border-ink-900/[0.06] space-y-3">
                  {latestExpenses.map((e) => (
                    <div key={e.id} className="flex justify-between items-center">
                      <div>
                        <p className="text-[13px] font-semibold text-ink-900">{e.description}</p>
                        <p className="text-xs text-ink-900/45">
                          {e.category} · {householdName(e.paidByHouseholdId!)}
                        </p>
                      </div>
                      <p className="font-semibold text-ink-900 text-[13px]">
                        ${Number(e.totalAmount).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Link to="/money">
                <div className="flex items-center gap-1 text-sm font-semibold text-lagoon-600 mt-4 group cursor-pointer">
                  Open the ledger
                  <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Birthday photos strip */}
        {birthdayPhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45, ease }}
          >
            <div className="flex items-center gap-2 mb-3 px-0.5">
              <PartyPopper className="h-4 w-4 text-papaya-500" />
              <p className="text-[11px] font-bold text-ink-900/35 uppercase tracking-[0.1em]">
                Jordan turns 40
              </p>
            </div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
              {birthdayPhotos.map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  className="h-36 w-36 object-cover rounded-2xl shrink-0 shadow-card"
                  alt={`Jordan — photo ${i + 1}`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
