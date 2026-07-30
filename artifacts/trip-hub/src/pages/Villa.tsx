import { useListRooms, useGetSettings, useUpdateRoom, getListRoomsQueryKey, useListHouseholds } from "@workspace/api-client-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Bed, Bath, Users, ExternalLink, Image as ImageIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function Villa() {
  const { data: rooms = [], isLoading: loadingRooms } = useListRooms();
  const { data: households = [], isLoading: loadingHouseholds } = useListHouseholds();
  const { data: settingsData } = useGetSettings();
  const settings = settingsData || {};
  const queryClient = useQueryClient();
  const updateRoom = useUpdateRoom();

  if (loadingRooms || loadingHouseholds) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-20 bg-sand-200/50 animate-pulse rounded-2xl" />
        <div className="h-40 bg-sand-200/50 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const handleAssignHousehold = (roomId: number, householdIdStr: string) => {
    const assignedHouseholdId = householdIdStr ? Number(householdIdStr) : null;
    updateRoom.mutate({ id: roomId, data: { assignedHouseholdId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
        toast.success("Room assignment updated");
      }
    });
  };

  return (
    <div className="pb-8 animate-in fade-in duration-500">
      <PageHeader eyebrow="The House" title={settings.property_name || "The Villa"} subtitle={settings.property_location} />

      <div className="px-5 space-y-8">
        <div className="bg-ink-950 text-sand-50 p-6 rounded-3xl shadow-card">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-xs font-bold text-brass-500 uppercase tracking-widest mb-1">Check-in</p>
              <p className="text-lg font-medium">{settings.check_in_time || "4:00 PM"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-brass-500 uppercase tracking-widest mb-1">Check-out</p>
              <p className="text-lg font-medium">{settings.check_out_time || "10:00 AM"}</p>
            </div>
          </div>
          
          {settings.house_rules && (
            <div className="border-t border-ink-800 pt-6">
              <p className="text-xs font-bold text-brass-500 uppercase tracking-widest mb-3">House Rules</p>
              <p className="text-sm text-sand-100/80 leading-relaxed whitespace-pre-wrap">{settings.house_rules}</p>
            </div>
          )}

          {settings.vrbo_url && (
            <a href={settings.vrbo_url} target="_blank" rel="noreferrer" className="mt-6 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-xl text-sm font-bold w-full tap">
              View on VRBO <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <div>
          <h2 className="font-display text-2xl text-ink-950 mb-4 px-1">Rooms</h2>
          <div className="space-y-4">
            {rooms.map(room => (
              <div key={room.id} className="bg-white rounded-3xl shadow-card overflow-hidden">
                {room.photoUrl ? (
                  <div className="w-full h-40 bg-sand-200">
                    <img 
                      src={room.photoUrl}
                      alt={room.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 bg-sand-100 flex items-center justify-center text-sand-200">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-display text-xl text-ink-950">{room.name}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 text-sm text-ink-700 mb-4">
                    {room.bedConfig && (
                      <div className="flex items-center gap-1.5 bg-sand-50 px-2.5 py-1 rounded-lg">
                        <Bed className="w-4 h-4 text-lagoon-600" />
                        <span>{room.bedConfig}</span>
                      </div>
                    )}
                    {room.bathLayout && (
                      <div className="flex items-center gap-1.5 bg-sand-50 px-2.5 py-1 rounded-lg">
                        <Bath className="w-4 h-4 text-lagoon-600" />
                        <span>{room.bathLayout}</span>
                      </div>
                    )}
                    {room.occupancy && (
                      <div className="flex items-center gap-1.5 bg-sand-50 px-2.5 py-1 rounded-lg">
                        <Users className="w-4 h-4 text-lagoon-600" />
                        <span>Sleeps {room.occupancy}</span>
                      </div>
                    )}
                  </div>
                  
                  {room.notes && (
                    <p className="text-sm text-ink-700/80 mb-5 leading-relaxed">{room.notes}</p>
                  )}

                  <div className="pt-4 border-t border-sand-100">
                    <label className="text-xs font-bold text-ink-500 uppercase block mb-2">Assigned To</label>
                    <select 
                      value={room.assignedHouseholdId || ""} 
                      onChange={(e) => handleAssignHousehold(room.id, e.target.value)}
                      className="w-full bg-sand-50 border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600 text-sm font-bold text-ink-950"
                    >
                      <option value="">Unassigned</option>
                      {households.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
