import { useListGuests, useUpdateGuest, getListGuestsQueryKey, useListHouseholds, useCreateGuest } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  PlaneLanding, PlaneTakeoff, Clock, AlertTriangle, Plus,
  Loader2, CheckCircle2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { toast } from "sonner";

// ── Flight status badge ──────────────────────────────────────────────────────
const FlightStatusBadge = ({ status, onClick }: { status?: string | null; onClick?: () => void }) => {
  const s = (status || "").toLowerCase();

  let content = (
    <span className="inline-flex items-center gap-1 bg-sand-200 text-ink-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
      {status || "Unknown"}
    </span>
  );
  if (s === "on_time" || s === "on time")
    content = <span className="inline-flex items-center gap-1 bg-lagoon-600/10 text-lagoon-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> On Time</span>;
  else if (s === "delayed")
    content = <span className="inline-flex items-center gap-1 bg-papaya-500/10 text-papaya-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Delayed</span>;
  else if (s === "landed")
    content = <span className="inline-flex items-center gap-1 bg-ink-900/10 text-ink-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"><PlaneLanding className="w-3 h-3" /> Landed</span>;
  else if (s === "cancelled")
    content = <span className="inline-flex items-center gap-1 bg-hibiscus-500/10 text-hibiscus-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Cancelled</span>;

  return (
    <button onClick={onClick} className="tap outline-none focus:ring-2 ring-lagoon-600 rounded-full" type="button">
      {content}
    </button>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────
/** Format an ISO datetime string in USVI local time (AST = UTC-4, no DST). */
function toUsviParts(iso: string): { date: string; time: string } {
  const dt = new Date(iso);
  const usvi = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/St_Thomas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(dt);
  const p = Object.fromEntries(usvi.map(({ type, value }) => [type, value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour === "24" ? "00" : p.hour}:${p.minute}`,
  };
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function Travel() {
  const { data: guests = [], isLoading } = useListGuests();
  const { data: households = [] } = useListHouseholds();
  const updateGuest = useUpdateGuest();
  const createGuest = useCreateGuest();
  const queryClient = useQueryClient();

  // Add-guest form state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [householdId, setHouseholdId] = useState<number | "">("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [flightNum, setFlightNum] = useState("");
  const [airline, setAirline] = useState("");

  // Flight lookup state
  type LookupState = "idle" | "loading" | "found" | "partial" | "not_found";
  const [lookupState, setLookupState] = useState<LookupState>("idle");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Debounced flight lookup ─────────────────────────────────────────────
  useEffect(() => {
    const cleaned = flightNum.replace(/\s+/g, "").toUpperCase();
    if (cleaned.length < 4) {
      setLookupState("idle");
      setLookupResult(null);
      return;
    }

    setLookupState("loading");
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ flightNumber: flightNum });
        if (arrivalDate) params.set("date", arrivalDate);

        const res = await fetch(`/api/flight/lookup?${params}`);
        const data = await res.json();

        if (data.error) {
          setLookupState("not_found");
          setLookupResult(null);
          return;
        }

        setLookupResult(data);

        // Always auto-fill airline if we got a name
        if (data.airline && !airline) setAirline(data.airline);

        // Auto-fill date + time if the API returned scheduled arrival
        const scheduledArrival = data.arrival?.estimated ?? data.arrival?.scheduled;
        if (scheduledArrival) {
          const { date, time } = toUsviParts(scheduledArrival);
          if (!arrivalDate) setArrivalDate(date);
          setArrivalTime(time);
          setLookupState("found");
        } else {
          // Got airline name but no schedule yet
          setLookupState(data.airline ? "partial" : "not_found");
        }
      } catch {
        setLookupState("not_found");
        setLookupResult(null);
      }
    }, 750);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [flightNum, arrivalDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setName("");
    setHouseholdId("");
    setArrivalDate("");
    setArrivalTime("");
    setFlightNum("");
    setAirline("");
    setLookupState("idle");
    setLookupResult(null);
  };

  // ── Sorted lists ────────────────────────────────────────────────────────
  const arrivals = guests
    .filter(g => g.arrivalDatetime)
    .sort((a, b) => new Date(a.arrivalDatetime!).getTime() - new Date(b.arrivalDatetime!).getTime());
  const departures = guests
    .filter(g => g.departureDatetime)
    .sort((a, b) => new Date(a.departureDatetime!).getTime() - new Date(b.departureDatetime!).getTime());

  // ── Status cycling ──────────────────────────────────────────────────────
  const handleStatusCycle = (guest: any) => {
    const statuses = ["on_time", "delayed", "landed", "cancelled"];
    const currentIdx = statuses.indexOf(guest.flightStatus || "on_time");
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    updateGuest.mutate({ id: guest.id, data: { flightStatus: nextStatus } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() }),
    });
  };

  // ── Add guest ───────────────────────────────────────────────────────────
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !householdId) return toast.error("Name and Household required");

    let arrivalDatetime: string | null = null;
    if (arrivalDate && arrivalTime) {
      arrivalDatetime = new Date(`${arrivalDate}T${arrivalTime}`).toISOString();
    }

    createGuest.mutate({
      data: {
        name,
        householdId: Number(householdId),
        arrivalDatetime,
        arrivalFlightNumber: flightNum || undefined,
        airline: airline || undefined,
        flightStatus: "on_time",
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() });
        setIsAddOpen(false);
        resetForm();
        toast.success("Guest added");
      },
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-20 bg-sand-200/50 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <PageHeader eyebrow="Logistics" title="Travel & Flights" subtitle="Who's landing when." />

      <div className="px-5 space-y-8">
        {/* Arrivals */}
        <div>
          <div className="flex justify-between items-center mb-4 px-1">
            <h2 className="font-display text-2xl text-ink-950 flex items-center gap-2">
              <PlaneLanding className="w-6 h-6 text-lagoon-600" /> Arrivals
            </h2>
            <button
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1 text-sm font-bold text-lagoon-600 tap bg-lagoon-600/10 px-3 py-1.5 rounded-full"
            >
              <Plus className="w-4 h-4" /> Guest
            </button>
          </div>
          <div className="space-y-3">
            {arrivals.map(guest => (
              <div key={`arr-${guest.id}`} className="bg-white rounded-2xl p-4 shadow-card">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-ink-950 text-lg">{guest.name}</h3>
                  <FlightStatusBadge status={guest.flightStatus} onClick={() => handleStatusCycle(guest)} />
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-sand-100">
                  <div>
                    <div className="text-xs font-bold text-ink-500 uppercase">Time</div>
                    <div className="text-sm font-medium text-ink-900">
                      {format(parseISO(guest.arrivalDatetime!), "MMM d, h:mm a")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink-500 uppercase">Flight</div>
                    <div className="text-sm font-medium text-ink-900">
                      {guest.airline} {guest.arrivalFlightNumber}
                    </div>
                  </div>
                </div>
                {guest.rentalCarInfo && (
                  <div className="mt-3 bg-sand-50 p-2.5 rounded-lg text-sm text-ink-700 flex gap-2 items-center">
                    <span className="font-bold text-ink-900 uppercase text-xs">Car</span>
                    {guest.rentalCarInfo}
                  </div>
                )}
              </div>
            ))}
            {arrivals.length === 0 && (
              <div className="text-ink-500 text-sm py-4 text-center">No arrivals logged.</div>
            )}
          </div>
        </div>

        {/* Departures */}
        <div>
          <h2 className="font-display text-2xl text-ink-950 mb-4 px-1 flex items-center gap-2">
            <PlaneTakeoff className="w-6 h-6 text-papaya-600" /> Departures
          </h2>
          <div className="space-y-3">
            {departures.map(guest => (
              <div key={`dep-${guest.id}`} className="bg-white rounded-2xl p-4 shadow-card opacity-80">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-ink-950 text-lg">{guest.name}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t border-sand-100">
                  <div>
                    <div className="text-xs font-bold text-ink-500 uppercase">Time</div>
                    <div className="text-sm font-medium text-ink-900">
                      {format(parseISO(guest.departureDatetime!), "MMM d, h:mm a")}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink-500 uppercase">Flight</div>
                    <div className="text-sm font-medium text-ink-900">
                      {guest.airline} {guest.departureFlightNumber}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {departures.length === 0 && (
              <div className="text-ink-500 text-sm py-4 text-center">No departures logged.</div>
            )}
          </div>
        </div>
      </div>

      {/* Add guest drawer */}
      <Drawer open={isAddOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddOpen(open); }}>
        <DrawerContent>
          <div className="px-2">
            <h2 className="font-display text-2xl text-ink-950 mb-6">Add Guest</h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  placeholder="e.g. Jordan"
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600"
                />
              </div>

              {/* Household */}
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Household</label>
                <select
                  value={householdId}
                  onChange={e => setHouseholdId(Number(e.target.value))}
                  required
                  className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600"
                >
                  <option value="" disabled>Select...</option>
                  {households.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>

              {/* Flight number with auto-lookup */}
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">
                  Flight Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={flightNum}
                    onChange={e => setFlightNum(e.target.value)}
                    placeholder="e.g. AA 1234 or DL 456"
                    className="w-full bg-white border-none rounded-xl p-3 pr-10 shadow-sm focus:ring-2 ring-lagoon-600"
                  />
                  {lookupState === "loading" && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400 animate-spin" />
                  )}
                  {lookupState === "found" && (
                    <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lagoon-600" />
                  )}
                </div>

                {/* Lookup result chip */}
                {lookupState === "found" && lookupResult && (
                  <div className="mt-2 flex items-start gap-2 bg-lagoon-50 text-lagoon-700 text-xs font-semibold px-3 py-2 rounded-xl leading-snug">
                    <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>
                      {lookupResult.flightIata}
                      {lookupResult.airline && ` · ${lookupResult.airline}`}
                      {lookupResult.departure?.iata && lookupResult.arrival?.iata
                        && ` · ${lookupResult.departure.iata} → ${lookupResult.arrival.iata}`}
                      {(lookupResult.arrival?.estimated ?? lookupResult.arrival?.scheduled) && (
                        <> · arrives {format(
                          parseISO(lookupResult.arrival.estimated ?? lookupResult.arrival.scheduled),
                          "MMM d, h:mm a"
                        )}</>
                      )}
                      {" — date & time filled in ✓"}
                    </span>
                  </div>
                )}
                {lookupState === "partial" && lookupResult?.airline && (
                  <div className="mt-2 flex items-center gap-2 bg-brass-500/10 text-brass-700 text-xs font-semibold px-3 py-2 rounded-xl">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    {lookupResult.airline} — enter arrival date to load the schedule
                  </div>
                )}
                {lookupState === "not_found" && flightNum.length >= 4 && (
                  <div className="mt-2 flex items-center gap-2 bg-amber-50 text-amber-700 text-xs font-semibold px-3 py-2 rounded-xl">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Flight not found — check the number or enter time manually
                  </div>
                )}
              </div>

              {/* Arrival date + time (auto-filled or manual) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Arrival Date</label>
                  <input
                    type="date"
                    value={arrivalDate}
                    onChange={e => setArrivalDate(e.target.value)}
                    className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">
                    Arrival Time
                    {lookupState === "found" && (
                      <span className="ml-1 text-[10px] text-lagoon-600 font-bold">auto</span>
                    )}
                  </label>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={e => setArrivalTime(e.target.value)}
                    className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createGuest.isPending}
                className="w-full bg-lagoon-600 text-white font-bold py-4 rounded-xl shadow-md mt-2 tap"
              >
                {createGuest.isPending ? "Adding..." : "Add Guest"}
              </button>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
