import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListItineraryItems, useCreateItineraryItem, useDeleteItineraryItem,
  useUpdateItineraryItem, getListItineraryItemsQueryKey,
  useListGuests, useListHouseholds,
} from "@workspace/api-client-react";
import {
  Sun, Sunset, Moon, Utensils, Sailboat, Map, Plus, Trash2,
  Pencil, PlaneLanding, PlaneTakeoff, Anchor, Bike, PartyPopper,
} from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const ease = [0.22, 1, 0.36, 1] as const;

// ── All 8 trip days ───────────────────────────────────────────────────────────
const TRIP_DAYS = [
  { label: "Day 1 — Arrival",  shortLabel: "Day 1",  date: "Oct 17", dow: "Sat", icon: PlaneLanding,  color: "text-lagoon-600"  },
  { label: "Day 2",            shortLabel: "Day 2",  date: "Oct 18", dow: "Sun", icon: Sun,           color: "text-brass-500"   },
  { label: "Day 3",            shortLabel: "Day 3",  date: "Oct 19", dow: "Mon", icon: Sailboat,      color: "text-lagoon-600"  },
  { label: "Day 4",            shortLabel: "Day 4",  date: "Oct 20", dow: "Tue", icon: Anchor,        color: "text-papaya-500"  },
  { label: "Day 5",            shortLabel: "Day 5",  date: "Oct 21", dow: "Wed", icon: Bike,          color: "text-lagoon-600"  },
  { label: "Day 6",            shortLabel: "Day 6",  date: "Oct 22", dow: "Thu", icon: PartyPopper,   color: "text-hibiscus-500"},
  { label: "Day 7",            shortLabel: "Day 7",  date: "Oct 23", dow: "Fri", icon: Sun,           color: "text-brass-500"   },
  { label: "Final Day",        shortLabel: "Final",  date: "Oct 24", dow: "Sat", icon: PlaneTakeoff,  color: "text-papaya-500"  },
];

// ── Flight date → day label map (USVI = America/St_Thomas, AST UTC-4) ────────
const DATE_TO_DAY: Record<string, string> = Object.fromEntries(
  TRIP_DAYS.map(d => {
    const [mon, day] = d.date.split(" ");
    const MONTHS: Record<string, string> = { Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12" };
    return [`2026-${MONTHS[mon]}-${day.padStart(2,"0")}`, d.label];
  })
);

function toUsviDate(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/St_Thomas", year:"numeric", month:"2-digit", day:"2-digit",
  }).formatToParts(new Date(iso));
  const p = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function toUsviTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/St_Thomas", hour:"numeric", minute:"2-digit", hour12: true,
  }).format(new Date(iso));
}

function timeToMinutes(t: string | null | undefined): number {
  if (!t) return 9999;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 9999;
  let h = parseInt(m[1]); const min = parseInt(m[2]); const ap = m[3].toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  morning:  { icon: Sun,          color: "text-brass-500",    bg: "bg-brass-50"     },
  afternoon:{ icon: Sun,          color: "text-papaya-500",   bg: "bg-papaya-50"    },
  evening:  { icon: Sunset,       color: "text-hibiscus-500", bg: "bg-hibiscus-50"  },
  night:    { icon: Moon,         color: "text-ink-700",      bg: "bg-ink-100"      },
  food:     { icon: Utensils,     color: "text-lagoon-600",   bg: "bg-lagoon-50"    },
  boat:     { icon: Sailboat,     color: "text-lagoon-600",   bg: "bg-lagoon-50"    },
  beach:    { icon: Anchor,       color: "text-lagoon-600",   bg: "bg-lagoon-50"    },
  activity: { icon: Bike,         color: "text-papaya-500",   bg: "bg-papaya-50"    },
  explore:  { icon: Map,          color: "text-brass-600",    bg: "bg-brass-50"     },
  arrival:  { icon: PlaneLanding, color: "text-lagoon-600",   bg: "bg-lagoon-50"    },
  general:  { icon: Sun,          color: "text-ink-400",      bg: "bg-sand-100"     },
};

function getCatConfig(cat?: string | null) {
  return CATEGORY_CONFIG[cat ?? "general"] ?? CATEGORY_CONFIG.general;
}

// ── Timeline item card ────────────────────────────────────────────────────────
function TimelineItem({
  item, onEdit, onDelete,
}: {
  item: any; onEdit: (item: any) => void; onDelete: (id: number) => void;
}) {
  const cfg = getCatConfig(item.category);
  const Icon = cfg.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.3, ease }}
      className="flex gap-3"
    >
      {/* Icon node */}
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center z-10`}>
          <Icon className={`w-4.5 h-4.5 ${cfg.color}`} />
        </div>
        <div className="w-0.5 flex-1 bg-sand-200 mt-1" />
      </div>

      {/* Content card */}
      <div className="flex-1 bg-white rounded-2xl shadow-card p-4 mb-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {item.time && (
              <p className="text-[11px] font-bold text-lagoon-600 uppercase tracking-wide mb-0.5">{item.time}</p>
            )}
            <h3 className="font-bold text-ink-950 text-[15px] leading-snug">{item.title}</h3>
            {item.description && (
              <p className="text-[13px] text-ink-600 mt-1.5 leading-relaxed">{item.description}</p>
            )}
          </div>
          <div className="flex gap-0.5 shrink-0">
            <button onClick={() => onEdit(item)} className="p-2 text-ink-300 hover:text-ink-600 tap rounded-lg">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => onDelete(item.id)} className="p-2 text-ink-300 hover:text-hibiscus-500 tap rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Flight event card (read-only) ─────────────────────────────────────────────
function FlightEventItem({ type, householdName, flightNumber, time }: {
  type: "arrival" | "departure"; householdName: string; flightNumber: string; time: string;
}) {
  const Icon = type === "arrival" ? PlaneLanding : PlaneTakeoff;
  const bg    = type === "arrival" ? "bg-lagoon-50"   : "bg-papaya-50";
  const color = type === "arrival" ? "text-lagoon-600" : "text-papaya-500";
  const border = type === "arrival" ? "border-lagoon-200 bg-lagoon-50/50" : "border-papaya-200 bg-papaya-50/50";
  const badge  = type === "arrival" ? "bg-lagoon-100 text-lagoon-700"     : "bg-papaya-100 text-papaya-700";
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center shrink-0">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center z-10`}>
          <Icon className={`w-4.5 h-4.5 ${color}`} />
        </div>
        <div className="w-0.5 flex-1 bg-sand-200 mt-1" />
      </div>
      <div className={`flex-1 rounded-2xl border border-dashed ${border} p-4 mb-4 min-w-0`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {time && <p className={`text-[11px] font-bold uppercase tracking-wide mb-0.5 ${color}`}>{time}</p>}
            <h3 className="font-bold text-ink-950 text-[15px] leading-snug">
              {type === "arrival" ? "Arriving" : "Departing"} · {householdName}
            </h3>
            {flightNumber && <p className="text-[13px] text-ink-500 mt-1 font-medium">{flightNumber}</p>}
          </div>
          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
            {type === "arrival" ? "Arrival" : "Departure"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Weekend() {
  const { data: items = [], isLoading } = useListItineraryItems();
  const createItem = useCreateItineraryItem();
  const updateItem = useUpdateItineraryItem();
  const deleteItem = useDeleteItineraryItem();
  const queryClient = useQueryClient();
  const { data: guests = [] } = useListGuests();
  const { data: households = [] } = useListHouseholds();

  const [activeDay, setActiveDay] = useState(TRIP_DAYS[0].label);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  // Form state
  const [dayLabel, setDayLabel] = useState(TRIP_DAYS[0].label);
  const [time, setTime] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("explore");

  // Items grouped by day label
  const byDay = items.reduce((acc, item) => {
    if (!acc[item.dayLabel]) acc[item.dayLabel] = [];
    acc[item.dayLabel].push(item);
    return acc;
  }, {} as Record<string, typeof items>);

  // Synthetic flight events derived from guest data
  type FlightEvent = {
    key: string; type: "arrival" | "departure";
    householdName: string; flightNumber: string; time: string;
    dayLabel: string; sortMin: number;
  };
  const flightEvents: FlightEvent[] = [];
  for (const g of guests as any[]) {
    const hh = (households as any[]).find(h => h.id === g.householdId);
    const hhName: string = hh?.name ?? g.name ?? "Guest";
    if (g.arrivalDatetime) {
      const dayLabel = DATE_TO_DAY[toUsviDate(g.arrivalDatetime)];
      if (dayLabel) {
        const time = toUsviTime(g.arrivalDatetime);
        flightEvents.push({ key: `arr-${g.id}`, type: "arrival", householdName: hhName, flightNumber: g.arrivalFlightNumber ?? "", time, dayLabel, sortMin: timeToMinutes(time) });
      }
    }
    if (g.departureDatetime) {
      const dayLabel = DATE_TO_DAY[toUsviDate(g.departureDatetime)];
      if (dayLabel) {
        const time = toUsviTime(g.departureDatetime);
        flightEvents.push({ key: `dep-${g.id}`, type: "departure", householdName: hhName, flightNumber: g.departureFlightNumber ?? "", time, dayLabel, sortMin: timeToMinutes(time) });
      }
    }
  }

  // Scroll active day tab into view
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const btn = strip.querySelector(`[data-day="${activeDay}"]`) as HTMLElement | null;
    if (btn) btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeDay]);

  const resetForm = () => {
    setEditingId(null);
    setDayLabel(activeDay);
    setTime("");
    setTitle("");
    setDescription("");
    setCategory("explore");
  };

  const handleOpenAdd = (day?: string) => {
    resetForm();
    if (day) setDayLabel(day);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingId(item.id);
    setDayLabel(item.dayLabel);
    setTime(item.time || "");
    setTitle(item.title);
    setDescription(item.description || "");
    setCategory(item.category || "explore");
    setIsDrawerOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Remove this plan?")) {
      deleteItem.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListItineraryItemsQueryKey() });
          toast.success("Removed");
        },
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return toast.error("Title required");
    const payload = { dayLabel, time, title, description, category };

    if (editingId) {
      updateItem.mutate({ id: editingId, data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListItineraryItemsQueryKey() });
          setIsDrawerOpen(false);
          toast.success("Updated");
        },
      });
    } else {
      createItem.mutate({ data: payload }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListItineraryItemsQueryKey() });
          setIsDrawerOpen(false);
          toast.success("Added to the plan");
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-20 bg-sand-200/50 animate-pulse rounded-2xl" />
        <div className="h-40 bg-sand-200/50 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const activeDayItems = byDay[activeDay] ?? [];
  const activeDayMeta = TRIP_DAYS.find(d => d.label === activeDay) ?? TRIP_DAYS[0];

  return (
    <div className="pb-24 animate-in fade-in duration-500">

      {/* ── Page header ── */}
      <div className="px-5 pt-6 pb-4 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold text-ink-400 tracking-[0.18em] uppercase mb-0.5">The Plan</p>
          <h1 className="font-display text-3xl font-medium text-ink-950">Trip Agenda</h1>
          <p className="text-[13px] text-ink-400 mt-0.5">Loose plans, tight vibes.</p>
        </div>
        <button
          onClick={() => handleOpenAdd(activeDay)}
          className="w-12 h-12 bg-lagoon-600 text-white rounded-full flex items-center justify-center shadow-card tap shrink-0 mt-1"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      {/* ── Day strip ── */}
      <div
        ref={stripRef}
        className="flex gap-2.5 overflow-x-auto no-scrollbar px-5 pb-4"
      >
        {TRIP_DAYS.map(day => {
          const isActive = day.label === activeDay;
          const hasItems = (byDay[day.label]?.length ?? 0) > 0 || flightEvents.some(f => f.dayLabel === day.label);
          const DayIcon = day.icon;

          return (
            <button
              key={day.label}
              data-day={day.label}
              onClick={() => setActiveDay(day.label)}
              className={`flex-shrink-0 flex flex-col items-center gap-1 px-3 pt-3 pb-2.5 rounded-2xl transition-all duration-200 tap min-w-[64px] border ${
                isActive
                  ? "bg-ink-950 border-ink-950 shadow-card"
                  : "bg-white border-sand-200 shadow-sm"
              }`}
            >
              <DayIcon className={`w-4 h-4 ${isActive ? "text-white/70" : day.color}`} />
              <span className={`text-[11px] font-bold leading-none ${isActive ? "text-white" : "text-ink-900"}`}>
                {day.dow}
              </span>
              <span className={`text-[10px] leading-none ${isActive ? "text-white/50" : "text-ink-400"}`}>
                {day.date}
              </span>
              {/* Item count dot */}
              {hasItems && (
                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isActive ? "bg-lagoon-400" : "bg-lagoon-600"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Day content ── */}
      <div className="px-5">
        {/* Day title */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl text-ink-950">
              {activeDayMeta.shortLabel === "Final" ? "Final Day" : activeDayMeta.label}
            </h2>
            <p className="text-[12px] text-ink-400 mt-0.5">
              {activeDayMeta.dow}, {activeDayMeta.date} · 2026
            </p>
          </div>
          <button
            onClick={() => handleOpenAdd(activeDay)}
            className="flex items-center gap-1.5 text-[12px] font-bold text-lagoon-600 bg-lagoon-600/10 px-3.5 py-2 rounded-full tap"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {/* Timeline */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeDay}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease }}
          >
            {(() => {
              const activeDayFlights = flightEvents
                .filter(f => f.dayLabel === activeDay)
                .sort((a, b) => a.sortMin - b.sortMin);
              const regularItems = (byDay[activeDay] ?? []).map(item => ({
                ...item, _sortMin: timeToMinutes(item.time), _isFlight: false as const,
              }));
              const flightItems = activeDayFlights.map(f => ({ ...f, _sortMin: f.sortMin, _isFlight: true as const }));
              const allItems = [...regularItems, ...flightItems].sort((a, b) => a._sortMin - b._sortMin);

              if (allItems.length > 0) return (
                <div>
                  <AnimatePresence>
                    {allItems.map(item =>
                      item._isFlight ? (
                        <FlightEventItem key={(item as any).key} {...(item as any)} />
                      ) : (
                        <TimelineItem
                          key={(item as any).id}
                          item={item}
                          onEdit={handleOpenEdit}
                          onDelete={handleDelete}
                        />
                      )
                    )}
                  </AnimatePresence>
                </div>
              );

              return (
                <button
                  onClick={() => handleOpenAdd(activeDay)}
                  className="w-full border-2 border-dashed border-sand-200 rounded-3xl py-12 flex flex-col items-center gap-3 tap hover:border-lagoon-300 hover:bg-lagoon-50/30 transition-colors"
                >
                  <div className="w-12 h-12 rounded-2xl bg-sand-100 flex items-center justify-center">
                    <Plus className="w-6 h-6 text-ink-300" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-ink-900/50 text-[14px]">Nothing planned yet</p>
                    <p className="text-[12px] text-ink-400 mt-0.5">Tap to add something for {activeDayMeta.dow}</p>
                  </div>
                </button>
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Add / Edit drawer ── */}
      <Drawer open={isDrawerOpen} onOpenChange={v => { if (!v) resetForm(); setIsDrawerOpen(v); }}>
        <DrawerContent>
          <div className="px-2">
            <h2 className="font-display text-2xl text-ink-950 mb-6">
              {editingId ? "Edit Plan" : "Add to Plan"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 pb-8">
              {/* Day selector */}
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Day</label>
                <select
                  value={dayLabel}
                  onChange={e => setDayLabel(e.target.value)}
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600"
                >
                  {TRIP_DAYS.map(d => (
                    <option key={d.label} value={d.label}>
                      {d.dow} {d.date} — {d.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600"
                  >
                    <option value="explore">🗺 Explore</option>
                    <option value="food">🍽 Food & Drink</option>
                    <option value="boat">⛵ Boat</option>
                    <option value="beach">⚓ Beach</option>
                    <option value="activity">🚴 Activity</option>
                    <option value="morning">🌅 Morning</option>
                    <option value="afternoon">☀️ Afternoon</option>
                    <option value="evening">🌇 Evening</option>
                    <option value="night">🌙 Night</option>
                    <option value="arrival">✈️ Arrival</option>
                    <option value="general">📌 General</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Time (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 10:00 AM"
                    value={time}
                    onChange={e => setTime(e.target.value)}
                    className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                  placeholder="What are you doing?"
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Details (optional)</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Any notes, reservations, links…"
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={createItem.isPending || updateItem.isPending}
                className="w-full bg-lagoon-600 text-white font-bold py-4 rounded-xl shadow-md tap"
              >
                {editingId ? "Save Changes" : "Add to Plan"}
              </button>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
