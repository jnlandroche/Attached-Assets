import { useListHouseholds, useListGuests, useListRooms, useGetSettings } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Users, PlaneLanding, PlaneTakeoff, Info } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ImageCarousel } from "@/components/ui/ImageCarousel";

export default function Crew() {
  const { data: households = [], isLoading: loadingHouseholds } = useListHouseholds();
  const { data: guests = [], isLoading: loadingGuests } = useListGuests();
  const { data: rooms = [], isLoading: loadingRooms } = useListRooms();
  const { data: settingsData } = useGetSettings();
  const settings = settingsData || {};

  let groupPhotos = [];
  try { groupPhotos = JSON.parse(settings.group_photos || "[]"); } catch (e) {}

  if (loadingHouseholds || loadingGuests || loadingRooms) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-20 bg-sand-200/50 animate-pulse rounded-2xl" />
        <div className="h-40 bg-sand-200/50 animate-pulse rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <PageHeader eyebrow="The People" title="The Crew" subtitle="Who's coming and where they're staying." />

      {groupPhotos.length > 0 && (
        <div className="mb-8 w-full shadow-sm">
          <ImageCarousel images={groupPhotos} />
        </div>
      )}

      <div className="px-5 space-y-6">
        {households.map((household) => {
          const hhGuests = guests.filter(g => g.householdId === household.id);
          const hhRoom = rooms.find(r => r.assignedHouseholdId === household.id);

          return (
            <div key={household.id} className="bg-white rounded-3xl shadow-card overflow-hidden">
              {household.photoUrl ? (
                <div className="w-full h-48 bg-sand-200">
                  <img 
                    src={household.photoUrl}
                    alt={household.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              ) : (
                <div className="w-full h-32 bg-ink-950 flex items-center justify-center">
                  <h3 className="font-display text-3xl text-sand-50 opacity-50">{household.name}</h3>
                </div>
              )}
              
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="font-display text-2xl text-ink-950">{household.name}</h2>
                  {hhRoom && (
                    <div className="bg-sand-100 text-ink-800 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                      {hhRoom.name}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {hhGuests.map(guest => (
                    <div key={guest.id} className="bg-sand-50 rounded-2xl p-3 flex flex-col gap-2">
                      <div className="font-bold text-ink-900">{guest.name}</div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-ink-700">
                        {guest.arrivalDatetime && (
                          <div className="flex items-center gap-1.5">
                            <PlaneLanding className="w-3.5 h-3.5 text-lagoon-600" />
                            <span>{format(parseISO(guest.arrivalDatetime), 'MMM d, h:mm a')}</span>
                          </div>
                        )}
                        {guest.departureDatetime && (
                          <div className="flex items-center gap-1.5">
                            <PlaneTakeoff className="w-3.5 h-3.5 text-papaya-600" />
                            <span>{format(parseISO(guest.departureDatetime), 'MMM d, h:mm a')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {hhGuests.length === 0 && (
                    <div className="text-sm text-ink-700/60 italic px-2">No guests added yet.</div>
                  )}
                </div>

                {household.notes && (
                  <div className="mt-4 flex gap-2 items-start bg-sand-50/50 p-3 rounded-xl border border-sand-100">
                    <Info className="w-4 h-4 text-brass-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-ink-800 leading-relaxed">{household.notes}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
