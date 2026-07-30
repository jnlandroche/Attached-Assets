import { useListGuideEntries, useUpdateGuideEntry, getListGuideEntriesQueryKey } from "@workspace/api-client-react";
import { MapPin, Navigation, Heart, Globe, UtensilsCrossed, Wine, Waves, Sailboat, Zap, ShoppingBasket, Coffee } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const ST_JOHN_HERO = "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=1200&q=85&fit=crop&crop=center";

const categories = [
  { id: "dining",   label: "Dining",     icon: UtensilsCrossed },
  { id: "bar",      label: "Bars",       icon: Wine            },
  { id: "beach",    label: "Beaches",    icon: Waves           },
  { id: "boat",     label: "Boats",      icon: Sailboat        },
  { id: "activity", label: "Activities", icon: Zap             },
  { id: "grocery",  label: "Grocery",    icon: ShoppingBasket  },
  { id: "coffee",   label: "Coffee",     icon: Coffee          },
];

export default function Explore() {
  const [activeTab, setActiveTab] = useState("dining");
  const { data: entries = [], isLoading } = useListGuideEntries();
  const updateEntry = useUpdateGuideEntry();
  const queryClient = useQueryClient();

  const toggleFavorite = (id: number, current: boolean) => {
    updateEntry.mutate(
      { id, data: { favorited: !current } },
      {
        onSuccess: (updated) => {
          queryClient.setQueryData(getListGuideEntriesQueryKey(), (old: any) =>
            old?.map((item: any) => item.id === id ? { ...item, favorited: updated.favorited } : item)
          );
        },
      }
    );
  };

  const currentEntries = entries.filter(e => e.type === activeTab);

  return (
    <div className="pb-8 animate-in fade-in duration-500">

      {/* ── St. John hero banner ── */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={ST_JOHN_HERO}
          alt="St. John, USVI"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Deep gradient so text pops cleanly */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 via-ink-950/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="text-[10px] font-bold text-brass-400 tracking-[0.2em] uppercase mb-1"
          >
            The Island
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease }}
            className="font-display text-3xl font-medium text-white leading-tight"
          >
            Explore St. John
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-white/60 text-[12px] mt-0.5"
          >
            Curated spots for the trip.
          </motion.p>
        </div>
        {/* Smooth blend into page background */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-sand-50 to-transparent" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-1">
        {/* Category tabs with icons */}
        <div className="px-5 mb-6">
          <TabsList className="w-full h-auto flex flex-wrap gap-2 bg-transparent p-0 justify-start">
            {categories.map(cat => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="rounded-full px-3.5 py-2 bg-sand-100 text-ink-700 data-[state=active]:bg-ink-950 data-[state=active]:text-white shadow-none data-[state=active]:shadow-card transition-all flex items-center gap-1.5"
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-white" : "text-ink-500"}`} />
                  {cat.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <div className="px-5">
          {categories.map(cat => {
            const CatIcon = cat.icon;
            return (
              <TabsContent key={cat.id} value={cat.id} className="m-0 space-y-4 outline-none">
                {isLoading ? (
                  <div className="space-y-4">
                    <div className="h-32 bg-sand-200/50 animate-pulse rounded-2xl" />
                    <div className="h-32 bg-sand-200/50 animate-pulse rounded-2xl" />
                  </div>
                ) : currentEntries.length === 0 ? (
                  <div className="py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
                      <CatIcon className="w-7 h-7 text-ink-300" />
                    </div>
                    <p className="text-ink-900/40 text-sm">No {cat.label.toLowerCase()} spots yet.</p>
                  </div>
                ) : (
                  currentEntries.map(entry => (
                    <div key={entry.id} className="bg-white rounded-3xl shadow-card overflow-hidden relative">
                      <button
                        onClick={() => toggleFavorite(entry.id, !!entry.favorited)}
                        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/80 backdrop-blur shadow-sm flex items-center justify-center tap"
                      >
                        <Heart className={`w-5 h-5 transition-colors ${entry.favorited ? "fill-hibiscus-500 text-hibiscus-500" : "text-ink-900/40"}`} />
                      </button>

                      {entry.photoUrl && (
                        <div className="w-full h-48 bg-sand-200">
                          <img
                            src={entry.photoUrl}
                            alt={entry.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-lg bg-sand-100 flex items-center justify-center">
                            <CatIcon className="w-3.5 h-3.5 text-ink-500" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{cat.label}</span>
                        </div>

                        <h3 className="font-display text-xl text-ink-950 mb-1 pr-10">{entry.name}</h3>
                        {entry.subtitle && <p className="text-sm text-ink-700/80 mb-3">{entry.subtitle}</p>}

                        <div className="flex flex-wrap gap-2 text-xs font-bold text-ink-800 mb-4">
                          {entry.priceTier && (
                            <div className="bg-sand-50 px-2 py-1 rounded-md">{entry.priceTier}</div>
                          )}
                          {entry.distanceFromVilla && (
                            <div className="bg-sand-50 px-2 py-1 rounded-md flex items-center gap-1">
                              <Navigation className="w-3 h-3 text-lagoon-600" />
                              {entry.distanceFromVilla}
                            </div>
                          )}
                          {entry.reservationStatus && (
                            <div className="bg-brass-500/10 text-brass-600 px-2 py-1 rounded-md">
                              {entry.reservationStatus}
                            </div>
                          )}
                        </div>

                        {entry.notes && (
                          <p className="text-sm text-ink-900/70 mb-5 leading-relaxed">{entry.notes}</p>
                        )}

                        <div className="flex gap-2">
                          {entry.mapUrl && (
                            <a href={entry.mapUrl} target="_blank" rel="noreferrer" className="flex-1 bg-ink-950 text-white text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 tap">
                              <MapPin className="w-4 h-4" /> Map
                            </a>
                          )}
                          {entry.websiteUrl && (
                            <a href={entry.websiteUrl} target="_blank" rel="noreferrer" className="flex-1 bg-sand-100 text-ink-950 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 tap">
                              <Globe className="w-4 h-4" /> Site
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            );
          })}
        </div>
      </Tabs>
    </div>
  );
}
