import { useState } from "react";
import { useListRooms, useGetSettings, useUpdateRoom, getListRoomsQueryKey, useListHouseholds } from "@workspace/api-client-react";
import {
  Bed, Bath, Users, ExternalLink, Star, Wifi, Waves, ChevronLeft, ChevronRight,
  Thermometer, UtensilsCrossed, Car, TreePalm, KeyRound, ShowerHead, Wind,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

// ── Property constants ────────────────────────────────────────────────────────
const VILLA_DESCRIPTION =
  "Perched above Chocolate Hole bay with sweeping panoramic views of the Caribbean, Terrapin Station is a private 4-bedroom, 4-bath villa with a sparkling pool, three covered outdoor terraces, and lush tropical landscaping. Two upstairs primary suites — each 350+ sq ft with king beds and screened porches — anchor the upper level. Two private lower-level apartments each have their own entrance, kitchenette, and outdoor space, making this the ideal layout for four couples traveling together.";

const AMENITIES = [
  { icon: Waves,          label: "Private pool" },
  { icon: Wifi,           label: "High-speed WiFi" },
  { icon: UtensilsCrossed,label: "Full kitchen" },
  { icon: Wind,           label: "A/C throughout" },
  { icon: Car,            label: "Free parking" },
  { icon: KeyRound,       label: "4 private entrances" },
  { icon: TreePalm,       label: "3 outdoor terraces" },
  { icon: ShowerHead,     label: "4 en-suite baths" },
  { icon: Thermometer,    label: "Outdoor grill" },
  { icon: Star,           label: "9.6 / 10 · 82 reviews" },
];

// All confirmed VRBO gallery images for this property
const VILLA_GALLERY = [
  "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/567949bb.jpg?impolicy=resizecrop&rw=1200&ra=fit",
  "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/a0784551.jpg?impolicy=resizecrop&rw=1200&ra=fit",
  "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/82e7684c.jpg?impolicy=resizecrop&rw=1200&ra=fit",
  "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/b2170c33.jpg?impolicy=resizecrop&rw=1200&ra=fit",
  "https://media.vrbo.com/lodging/60000000/59240000/59236700/59236603/6854944b.jpg?impolicy=resizecrop&rw=1200&ra=fit",
];

// ── Gallery carousel ──────────────────────────────────────────────────────────
function VillaGallery({ photos }: { photos: string[] }) {
  const [idx, setIdx] = useState(0);
  const [errored, setErrored] = useState<Set<number>>(new Set());

  const valid = photos.filter((_, i) => !errored.has(i));
  const cur = photos[idx];
  const validIdx = valid.indexOf(cur);

  const prev = () => setIdx(i => (i - 1 + photos.length) % photos.length);
  const next = () => setIdx(i => (i + 1) % photos.length);

  if (valid.length === 0) return null;

  return (
    <div className="relative w-full overflow-hidden" style={{ aspectRatio: "16/9" }}>
      {photos.map((src, i) => (
        <motion.img
          key={src}
          src={src}
          alt=""
          onError={() => setErrored(prev => new Set([...prev, i]))}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: i === idx ? 1 : 0 }}
          transition={{ duration: 0.6, ease }}
        />
      ))}

      {/* Counter */}
      <div className="absolute bottom-3 right-4 bg-black/50 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
        {validIdx + 1} / {valid.length}
      </div>

      {/* Nav arrows */}
      {photos.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center tap text-white">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center tap text-white">
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots */}
      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-1.5 h-1.5 rounded-full transition-all ${i === idx ? "bg-white w-4" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Villa() {
  const { data: rooms = [], isLoading: loadingRooms } = useListRooms();
  const { data: households = [], isLoading: loadingHouseholds } = useListHouseholds();
  const { data: settingsData } = useGetSettings();
  const settings: Record<string, string> = (settingsData as any) || {};
  const queryClient = useQueryClient();
  const updateRoom = useUpdateRoom();

  const galleryPhotos = (() => {
    try {
      const g = settings.villa_gallery ? JSON.parse(settings.villa_gallery) : [];
      return g.length > 0 ? g : VILLA_GALLERY;
    } catch { return VILLA_GALLERY; }
  })();

  if (loadingRooms || loadingHouseholds) {
    return (
      <div className="space-y-4">
        <div className="aspect-video bg-sand-200/50 animate-pulse" />
        <div className="px-5 space-y-3">
          <div className="h-24 bg-sand-200/50 animate-pulse rounded-2xl" />
          <div className="h-40 bg-sand-200/50 animate-pulse rounded-2xl" />
        </div>
      </div>
    );
  }

  const handleAssignHousehold = (roomId: number, householdIdStr: string) => {
    const assignedHouseholdId = householdIdStr ? Number(householdIdStr) : null;
    updateRoom.mutate({ id: roomId, data: { assignedHouseholdId } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() });
        toast.success("Room assignment updated");
      },
    });
  };

  return (
    <div className="pb-10 animate-in fade-in duration-500">

      {/* ── Photo gallery hero ── */}
      <VillaGallery photos={galleryPhotos} />

      {/* ── Property title + stats ── */}
      <div className="px-5 pt-5 pb-1">
        <p className="text-[10px] font-bold text-ink-400 tracking-[0.18em] uppercase mb-1">The House</p>
        <h1 className="font-display text-3xl font-medium text-ink-950 leading-tight">
          {settings.property_name || "Terrapin Station"}
        </h1>
        <p className="text-sm text-ink-500 mt-1">{settings.property_location || "Chocolate Hole, St. John, USVI"}</p>

        {/* Rating + quick stats row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-brass-500/10 px-3 py-1.5 rounded-full">
            <Star className="w-3.5 h-3.5 text-brass-600 fill-brass-600" />
            <span className="text-[12px] font-bold text-brass-700">9.6 / 10</span>
            <span className="text-[11px] text-ink-400">82 reviews</span>
          </div>
          <div className="flex items-center gap-1.5 bg-sand-100 px-3 py-1.5 rounded-full">
            <Bed className="w-3.5 h-3.5 text-ink-500" />
            <span className="text-[12px] font-semibold text-ink-700">4 bedrooms</span>
          </div>
          <div className="flex items-center gap-1.5 bg-sand-100 px-3 py-1.5 rounded-full">
            <Users className="w-3.5 h-3.5 text-ink-500" />
            <span className="text-[12px] font-semibold text-ink-700">Sleeps 8–10</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5 space-y-5">

        {/* ── Check-in / Check-out ── */}
        <div className="bg-ink-950 text-sand-50 p-5 rounded-3xl shadow-card">
          <div className="grid grid-cols-2 gap-6 mb-5">
            <div>
              <p className="text-[10px] font-bold text-brass-400 uppercase tracking-widest mb-1">Check-in</p>
              <p className="text-2xl font-display font-medium">{settings.check_in_time || "4:00 PM"}</p>
              <p className="text-[11px] text-white/40 mt-0.5">Oct 17, 2026</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-brass-400 uppercase tracking-widest mb-1">Check-out</p>
              <p className="text-2xl font-display font-medium">{settings.check_out_time || "10:00 AM"}</p>
              <p className="text-[11px] text-white/40 mt-0.5">Oct 24, 2026</p>
            </div>
          </div>

          {settings.vrbo_url && (
            <a
              href={settings.vrbo_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-xl text-sm font-bold w-full tap"
            >
              View on VRBO <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* ── About ── */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <p className="text-[10px] font-bold text-ink-400 tracking-[0.18em] uppercase mb-2">About</p>
          <p className="text-[14px] text-ink-700 leading-relaxed">{VILLA_DESCRIPTION}</p>
        </div>

        {/* ── Amenities grid ── */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <p className="text-[10px] font-bold text-ink-400 tracking-[0.18em] uppercase mb-4">What's included</p>
          <div className="grid grid-cols-2 gap-3">
            {AMENITIES.map(a => {
              const Icon = a.icon;
              return (
                <div key={a.label} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-lagoon-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-lagoon-600" />
                  </div>
                  <span className="text-[13px] font-medium text-ink-800 leading-tight">{a.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── House rules ── */}
        {settings.house_rules && (
          <div className="bg-white rounded-3xl shadow-card p-5">
            <p className="text-[10px] font-bold text-ink-400 tracking-[0.18em] uppercase mb-3">House Rules</p>
            <p className="text-sm text-ink-700/80 leading-relaxed whitespace-pre-wrap">{settings.house_rules}</p>
          </div>
        )}

        {/* ── Rooms ── */}
        <div>
          <p className="text-[10px] font-bold text-ink-400 tracking-[0.18em] uppercase mb-1 px-1">Rooms</p>
          <p className="text-[12px] text-ink-400 mb-4 px-1">Who's sleeping where</p>
          <div className="space-y-4">
            {rooms.map((room, ri) => {
              const hh = households.find(h => h.id === room.assignedHouseholdId);
              return (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-20px" }}
                  transition={{ duration: 0.35, delay: ri * 0.05, ease }}
                  className="bg-white rounded-3xl shadow-card overflow-hidden"
                >
                  {room.photoUrl ? (
                    <div className="w-full h-44 bg-sand-200">
                      <img src={room.photoUrl} alt={room.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-32 bg-gradient-to-br from-lagoon-50 to-sand-100 flex items-center justify-center">
                      <Bed className="w-10 h-10 text-lagoon-200" />
                    </div>
                  )}
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-display text-xl text-ink-950 leading-snug flex-1 pr-2">{room.name}</h3>
                      {hh && (
                        <span className="shrink-0 text-[11px] font-bold text-lagoon-600 bg-lagoon-50 px-2.5 py-1 rounded-full">
                          {hh.name}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-ink-700 mb-4">
                      {room.bedConfig && (
                        <div className="flex items-center gap-1.5 bg-sand-50 px-2.5 py-1 rounded-lg">
                          <Bed className="w-3.5 h-3.5 text-lagoon-600" />
                          <span className="text-[12px]">{room.bedConfig}</span>
                        </div>
                      )}
                      {room.bathLayout && (
                        <div className="flex items-center gap-1.5 bg-sand-50 px-2.5 py-1 rounded-lg">
                          <Bath className="w-3.5 h-3.5 text-lagoon-600" />
                          <span className="text-[12px]">{room.bathLayout}</span>
                        </div>
                      )}
                      {room.occupancy && (
                        <div className="flex items-center gap-1.5 bg-sand-50 px-2.5 py-1 rounded-lg">
                          <Users className="w-3.5 h-3.5 text-lagoon-600" />
                          <span className="text-[12px]">Sleeps {room.occupancy}</span>
                        </div>
                      )}
                    </div>

                    {room.notes && (
                      <p className="text-[12px] text-ink-700/70 mb-4 leading-relaxed">{room.notes}</p>
                    )}

                    <div className="pt-4 border-t border-sand-100">
                      <label className="text-[10px] font-bold text-ink-400 uppercase tracking-wider block mb-2">
                        Assigned To
                      </label>
                      <select
                        value={room.assignedHouseholdId || ""}
                        onChange={e => handleAssignHousehold(room.id, e.target.value)}
                        className="w-full bg-sand-50 border-none rounded-xl p-3 shadow-sm outline-none focus:ring-2 ring-lagoon-600 text-sm font-bold text-ink-950"
                      >
                        <option value="">Unassigned</option>
                        {households.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
