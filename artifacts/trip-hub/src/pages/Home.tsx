import { useGetSettings } from "@workspace/api-client-react";
import { ImageCarousel } from "@/components/ui/ImageCarousel";
import { Section } from "@/components/ui/Section";
import { HorizonWave } from "@/components/ui/HorizonWave";
import { Bell, MapPin, Calendar } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { motion } from "framer-motion";

export default function Home() {
  const { data: settingsData } = useGetSettings();
  const settings = settingsData || {};

  // Parse JSON settings
  let villaGallery = [];
  try { villaGallery = JSON.parse(settings.villa_gallery || "[]"); } catch (e) {}
  
  let birthdayPhotos = [];
  try { birthdayPhotos = JSON.parse(settings.birthday_photos || "[]"); } catch (e) {}

  const checkInDate = settings.check_in_date ? parseISO(settings.check_in_date) : null;
  const daysUntil = checkInDate ? differenceInDays(checkInDate, new Date()) : null;

  return (
    <div className="bg-sand-50 animate-in fade-in duration-500">
      <div className="relative">
        <ImageCarousel images={villaGallery} priority />
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/40 to-transparent pointer-events-none">
          <h1 className="font-display text-white text-3xl font-bold tracking-tight drop-shadow-md">
            {settings.trip_title || "Jordan's 40th"}
          </h1>
          <p className="text-white/90 text-sm font-medium mt-1 flex items-center gap-1.5 drop-shadow">
            <MapPin className="w-3.5 h-3.5" />
            {settings.property_location || "St. John, USVI"}
          </p>
        </div>
      </div>
      
      <div className="-mt-7 relative z-20">
        <HorizonWave className="text-sand-50 fill-current" />
      </div>

      <div className="px-5 -mt-2 mb-6">
        {daysUntil !== null && (
          <div className="bg-white rounded-2xl p-4 shadow-card flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-brass-600 uppercase tracking-widest mb-1">Countdown</p>
              <div className="font-display text-2xl text-ink-950">
                {daysUntil > 0 ? `${daysUntil} days left` : daysUntil === 0 ? "It's today!" : "Trip started!"}
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-sand-100 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-lagoon-600" />
            </div>
          </div>
        )}

        {settings.announcement && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-ink-950 rounded-2xl p-4 shadow-card text-sand-50 flex gap-3 items-start"
          >
            <Bell className="w-5 h-5 text-papaya-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-papaya-500 uppercase tracking-widest mb-1">Announcement</p>
              <p className="text-sm leading-relaxed">{settings.announcement}</p>
            </div>
          </motion.div>
        )}
      </div>

      <Section title="Jordan through the years">
        <div className="flex overflow-x-auto gap-4 snap-x snap-mandatory no-scrollbar -mx-5 px-5 pb-4">
          {birthdayPhotos.map((photo, i) => (
            <div key={i} className="shrink-0 w-[240px] aspect-[3/4] snap-center rounded-2xl overflow-hidden shadow-card">
              <img 
                src={photo.startsWith('http') ? photo : `${import.meta.env.BASE_URL.replace(/\/$/, '')}/api${photo}`} 
                alt={`Birthday moment ${i+1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          ))}
          {birthdayPhotos.length === 0 && (
            <div className="w-full h-40 flex items-center justify-center text-ink-900/40 text-sm border-2 border-dashed border-sand-200 rounded-2xl">
              No birthday photos yet
            </div>
          )}
        </div>
      </Section>
    </div>
  );
}
