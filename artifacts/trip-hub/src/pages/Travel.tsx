import { useListGuests, useUpdateGuest, getListGuestsQueryKey, useListHouseholds, useCreateGuest } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { PlaneLanding, PlaneTakeoff, Clock, AlertTriangle, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { toast } from "sonner";

const FlightStatusBadge = ({ status, onClick }: { status?: string | null, onClick?: () => void }) => {
  const s = (status || "").toLowerCase();
  
  let content = <span className="inline-flex items-center gap-1 bg-sand-200 text-ink-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">{status || "Unknown"}</span>;

  if (s === 'on_time' || s === 'on time') {
    content = <span className="inline-flex items-center gap-1 bg-lagoon-600/10 text-lagoon-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> On Time</span>;
  } else if (s === 'delayed') {
    content = <span className="inline-flex items-center gap-1 bg-papaya-500/10 text-papaya-600 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Delayed</span>;
  } else if (s === 'landed') {
    content = <span className="inline-flex items-center gap-1 bg-ink-900/10 text-ink-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"><PlaneLanding className="w-3 h-3" /> Landed</span>;
  } else if (s === 'cancelled') {
    content = <span className="inline-flex items-center gap-1 bg-hibiscus-500/10 text-hibiscus-500 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Cancelled</span>;
  }

  return (
    <button onClick={onClick} className="tap outline-none focus:ring-2 ring-lagoon-600 rounded-full" type="button">
      {content}
    </button>
  );
};

export default function Travel() {
  const { data: guests = [], isLoading } = useListGuests();
  const { data: households = [] } = useListHouseholds();
  const updateGuest = useUpdateGuest();
  const createGuest = useCreateGuest();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [householdId, setHouseholdId] = useState<number | "">("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [flightNum, setFlightNum] = useState("");

  const arrivals = guests.filter(g => g.arrivalDatetime).sort((a, b) => new Date(a.arrivalDatetime!).getTime() - new Date(b.arrivalDatetime!).getTime());
  const departures = guests.filter(g => g.departureDatetime).sort((a, b) => new Date(a.departureDatetime!).getTime() - new Date(b.departureDatetime!).getTime());

  const handleStatusCycle = (guest: any) => {
    const statuses = ['on_time', 'delayed', 'landed', 'cancelled'];
    const currentIdx = statuses.indexOf(guest.flightStatus || 'on_time');
    const nextStatus = statuses[(currentIdx + 1) % statuses.length];
    
    updateGuest.mutate({ id: guest.id, data: { flightStatus: nextStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() });
      }
    });
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !householdId) return toast.error("Name and Household required");

    let arrivalDatetime = null;
    if (arrivalDate && arrivalTime) {
      arrivalDatetime = new Date(`${arrivalDate}T${arrivalTime}`).toISOString();
    }

    createGuest.mutate({
      data: {
        name,
        householdId: Number(householdId),
        arrivalDatetime,
        arrivalFlightNumber: flightNum,
        flightStatus: "on_time"
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListGuestsQueryKey() });
        setIsAddOpen(false);
        toast.success("Guest added");
        setName("");
        setHouseholdId("");
      }
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
                    <div className="text-sm font-medium text-ink-900">{format(parseISO(guest.arrivalDatetime!), 'MMM d, h:mm a')}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink-500 uppercase">Flight</div>
                    <div className="text-sm font-medium text-ink-900">{guest.airline} {guest.arrivalFlightNumber}</div>
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
            {arrivals.length === 0 && <div className="text-ink-500 text-sm py-4 text-center">No arrivals logged.</div>}
          </div>
        </div>

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
                    <div className="text-sm font-medium text-ink-900">{format(parseISO(guest.departureDatetime!), 'MMM d, h:mm a')}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-ink-500 uppercase">Flight</div>
                    <div className="text-sm font-medium text-ink-900">{guest.airline} {guest.departureFlightNumber}</div>
                  </div>
                </div>
              </div>
            ))}
            {departures.length === 0 && <div className="text-ink-500 text-sm py-4 text-center">No departures logged.</div>}
          </div>
        </div>
      </div>

      <Drawer open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DrawerContent>
          <div className="px-2">
            <h2 className="font-display text-2xl text-ink-950 mb-6">Add Guest</h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600" />
              </div>
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Household</label>
                <select value={householdId} onChange={e => setHouseholdId(Number(e.target.value))} required className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600">
                  <option value="" disabled>Select...</option>
                  {households.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Arrival Date</label>
                  <input type="date" value={arrivalDate} onChange={e => setArrivalDate(e.target.value)} className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600" />
                </div>
                <div>
                  <label className="text-sm font-bold text-ink-900 block mb-1">Arrival Time</label>
                  <input type="time" value={arrivalTime} onChange={e => setArrivalTime(e.target.value)} className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600" />
                </div>
              </div>
              <div>
                <label className="text-sm font-bold text-ink-900 block mb-1">Flight Number (e.g. DL 123)</label>
                <input type="text" value={flightNum} onChange={e => setFlightNum(e.target.value)} className="w-full bg-white border-none rounded-xl p-3 shadow-sm focus:ring-2 ring-lagoon-600" />
              </div>
              <button type="submit" disabled={createGuest.isPending} className="w-full bg-lagoon-600 text-white font-bold py-4 rounded-xl shadow-md mt-4 tap">
                {createGuest.isPending ? "Adding..." : "Add Guest"}
              </button>
            </form>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
