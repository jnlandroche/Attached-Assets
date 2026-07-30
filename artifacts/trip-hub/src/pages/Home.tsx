import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Wallet, Plane, Compass, ChevronRight, PartyPopper, PlaneLanding } from "lucide-react";
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

// ── 7-day trip weather forecast ───────────────────────────────────────────────
type WeatherDay = { dow: string; date: string; emoji: string; label: string; high: number; low: number; rain: number };
type WeatherData = { source: "live" | "historical"; days: WeatherDay[] };

function WeatherForecast({ data }: { data: WeatherData | null }) {
  const days = data?.days ?? [];
  const source = data?.source ?? "historical";
  if (days.length === 0) return null;

  const rangeMin = Math.min(...days.map(d => d.low));
  const rangeMax = Math.max(...days.map(d => d.high));
  const isLive = source === "live";

  // Highlight today's tile; fall back to day 0 if today isn't in the forecast
  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const todayIdx = days.findIndex(d => d.date === todayLabel);
  const highlightIdx = todayIdx >= 0 ? todayIdx : 0;

  const headerLow  = Math.min(...days.map(d => d.low));
  const headerHigh = Math.max(...days.map(d => d.high));
  const headerRange = isLive ? `${headerLow}–${headerHigh}°F` : "85–88°F";
  const headerSub   = isLive ? "live forecast" : "historical averages";

  return (
    <div className="bg-white rounded-3xl shadow-card overflow-hidden">
      {/* Header gradient */}
      <div className="px-5 pt-5 pb-4"
        style={{ background: "linear-gradient(135deg, #e0f4f9 0%, #f0faf8 60%, #fff8ee 100%)" }}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold text-lagoon-700/60 tracking-[0.18em] uppercase mb-0.5">Weather</p>
            <h2 className="font-display text-xl font-medium text-ink-950">October Outlook</h2>
            <p className="text-[11px] text-ink-900/40 mt-0.5">St. John, USVI · {headerSub}</p>
          </div>
          <div className="text-right mt-1">
            <p className="text-[13px] font-bold text-lagoon-600">{headerRange}</p>
            <p className="text-[11px] text-ink-900/40">{isLive ? "forecast range" : "avg range"}</p>
          </div>
        </div>
      </div>

      {/* Day tiles — horizontal scroll */}
      <div className="flex gap-0 overflow-x-auto no-scrollbar border-t border-ink-900/[0.05]">
        {days.map((day, i) => {
          // Temp bar: position within range
          const barBot = ((day.low  - rangeMin) / (rangeMax - rangeMin)) * 100;
          const barTop = ((day.high - rangeMin) / (rangeMax - rangeMin)) * 100;
          const isFirst = i === highlightIdx;
          const isLast  = i === days.length - 1;
          return (
            <div
              key={`${day.dow}-${day.date}`}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-4 gap-1.5 min-w-[4.2rem]
                ${isFirst ? "" : "border-l border-ink-900/[0.05]"}
                ${isFirst ? "bg-lagoon-600/[0.04]" : ""}
                ${isLast  ? "bg-ink-900/[0.02]" : ""}`}
            >
              {/* Day label */}
              <p className={`text-[10px] font-bold tracking-wide uppercase ${isFirst ? "text-lagoon-600" : "text-ink-900/35"}`}>
                {day.dow}
              </p>
              <p className="text-[9px] text-ink-900/30">{day.date}</p>

              {/* Weather emoji */}
              <span className="text-2xl leading-none mt-0.5">{day.emoji}</span>

              {/* High temp */}
              <p className="text-[15px] font-bold text-ink-950 leading-none mt-1">{day.high}°</p>

              {/* Temp range bar */}
              <div className="w-1 h-10 rounded-full bg-ink-900/[0.07] relative overflow-hidden my-0.5">
                <div
                  className="absolute left-0 right-0 rounded-full"
                  style={{
                    bottom: `${barBot}%`,
                    height: `${barTop - barBot}%`,
                    background: day.rain >= 40
                      ? "linear-gradient(to top, #4fc3f7, #81d4fa)"
                      : "linear-gradient(to top, #f59e0b, #fbbf24)",
                  }}
                />
              </div>

              {/* Low temp */}
              <p className="text-[11px] text-ink-900/40 leading-none">{day.low}°</p>

              {/* Rain chance */}
              <p className={`text-[10px] font-semibold mt-0.5 ${day.rain >= 40 ? "text-sky-500" : "text-ink-900/25"}`}>
                {day.rain}%
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="px-5 py-3 border-t border-ink-900/[0.05] flex items-center justify-between">
        <p className="text-[10px] text-ink-900/30 leading-snug">
          💧 Rain % · 🌡️ High / Low
        </p>
        <p className="text-[10px] text-ink-900/30">
          {isLive ? "Live forecast" : "Actual forecast ~Oct 7"}
        </p>
      </div>
    </div>
  );
}

// ── Mini October calendar ────────────────────────────────────────────────────
function TripCalendar({ checkIn, checkOut }: { checkIn: string; checkOut: string }) {
  const inDate = new Date(checkIn + "T00:00:00");
  const outDate = new Date(checkOut + "T00:00:00");
  const year = inDate.getFullYear();
  const month = inDate.getMonth();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const inDay = inDate.getDate();
  const outDay = outDate.getDate();

  const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const monthLabel = inDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const nights = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-3xl shadow-card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-bold text-ink-900/30 tracking-[0.18em] uppercase mb-0.5">Calendar</p>
          <h2 className="font-display text-xl font-medium text-ink-950">{monthLabel}</h2>
        </div>
        <div className="text-right">
          <p className="text-[13px] font-bold text-lagoon-600">Oct {inDay}–{outDay}</p>
          <p className="text-xs text-ink-400">{nights} nights</p>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map((d) => (
          <div key={d} className="h-7 flex items-center justify-center text-[10px] font-bold text-ink-300 uppercase">
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="h-9" />;
          const isIn = day === inDay;
          const isOut = day === outDay;
          const inRange = day > inDay && day < outDay;
          // Determine which edges of the range row to round
          const col = (i) % 7; // 0=Sun … 6=Sat
          const rowStart = col === 0 || day === inDay + 1;
          const rowEnd = col === 6 || day === outDay - 1;
          return (
            <div
              key={day}
              className={`h-9 flex items-center justify-center relative
                ${inRange ? `bg-lagoon-600/10 ${rowStart ? "rounded-l-full" : ""} ${rowEnd ? "rounded-r-full" : ""}` : ""}
              `}
            >
              {isIn || isOut ? (
                <span className="w-8 h-8 rounded-full bg-lagoon-600 text-white flex items-center justify-center text-[13px] font-bold z-10">
                  {day}
                </span>
              ) : inRange ? (
                <span className="text-[13px] font-semibold text-lagoon-700">{day}</span>
              ) : (
                <span className="text-[13px] text-ink-400">{day}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-sand-100">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-lagoon-600" />
          <span className="text-[11px] text-ink-500">Check-in Oct {inDay}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-lagoon-600" />
          <span className="text-[11px] text-ink-500">Check-out Oct {outDay}</span>
        </div>
      </div>
    </div>
  );
}

function useCountdown(targetDateStr: string) {
  const getRemaining = () => {
    const target = new Date(targetDateStr + "T00:00:00");
    const now = new Date();
    const diff = target.getTime() - now.getTime();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, past: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, past: false };
  };
  const [remaining, setRemaining] = useState(getRemaining);
  useEffect(() => {
    setRemaining(getRemaining()); // re-seed immediately when date changes
    const t = setInterval(() => setRemaining(getRemaining()), 1000);
    return () => clearInterval(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDateStr]);
  return remaining;
}

function CountdownTile({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.span
        key={value}
        initial={{ opacity: 0.4, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease }}
        className="font-display text-[2.6rem] leading-none font-medium text-white tabular-nums"
      >
        {String(value).padStart(2, "0")}
      </motion.span>
      <span className="text-white/45 text-[9px] font-bold tracking-[0.18em] uppercase mt-1">
        {label}
      </span>
    </div>
  );
}

export default function Home() {
  const { data: settingsData } = useGetSettings();
  const { data: balances = [] } = useListBalances();
  const { data: guests = [] } = useListGuests();
  const { data: households = [] } = useListHouseholds();
  const { data: expenses = [] } = useListExpenses();

  const settings: Record<string, string> = (settingsData as Record<string, string>) || {};

  const destinationPhotos: string[] = settings.destination_photos ? JSON.parse(settings.destination_photos) : [];

  // Photos fetched from filesystem — no DB drift possible
  const [birthdayPhotos, setBirthdayPhotos] = useState<string[]>([]);
  const [groupPhotos, setGroupPhotos] = useState<string[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  useEffect(() => {
    fetch("/api/images/birthday-photos").then(r => r.json()).then(setBirthdayPhotos).catch(() => {});
    fetch("/api/images/group-photos").then(r => r.json()).then(setGroupPhotos).catch(() => {});
    fetch("/api/weather")
      .then(r => r.json())
      .then((data) => { setWeatherData(data); setWeatherLoading(false); })
      .catch(() => { setWeatherLoading(false); });
  }, []);

  // Hero uses destination (landscape) photos; fall back to group photos if none set
  const heroPhotos = destinationPhotos.length > 0 ? destinationPhotos : groupPhotos;
  // Combined people strip: group + birthday photos deduped
  const peoplePhotos = [...groupPhotos, ...birthdayPhotos].filter(
    (src, i, arr) => arr.indexOf(src) === i
  );

  const [heroIndex, setHeroIndex] = useState(0);
  useEffect(() => {
    if (heroPhotos.length < 2) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % heroPhotos.length), 5000);
    return () => clearInterval(t);
  }, [heroPhotos.length]);

  const checkIn = settings.check_in_date || "";
  const checkOut = settings.check_out_date || "";
  const countdown = useCountdown(checkIn || "2099-01-01");
  const hasDate = !!checkIn;

  const formatDateRange = () => {
    if (!checkIn || !checkOut) return null;
    const inDate = new Date(checkIn + "T00:00:00");
    const outDate = new Date(checkOut + "T00:00:00");
    const inStr = inDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const outStr = outDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return `${inStr} – ${outStr}`;
  };
  const dateRange = formatDateRange();

  const totalSpent = balances.reduce((sum: number, b) => sum + Number((b as { totalPaid?: number }).totalPaid ?? 0), 0);
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

  const announcement = settings.announcement && settings.announcement !== "Add a note here for the group — packing reminders, dinner plans, anything else."
    ? settings.announcement
    : null;

  const weather = settings.weather_summary || null;

  return (
    <div className="pb-10">

      {/* ── HERO ── */}
      <div className="relative h-[72vh] min-h-[540px] max-h-[720px] overflow-hidden">

        {/* Photo stack */}
        {heroPhotos.length > 0 ? heroPhotos.map((src, i) => (
          <motion.img
            key={src}
            src={src}
            className="absolute inset-0 h-full w-full object-cover"
            initial={{ opacity: 0, scale: 1.06 }}
            animate={{ opacity: i === heroIndex ? 1 : 0, scale: i === heroIndex ? 1 : 1.06 }}
            transition={{ duration: 2.2, ease }}
          />
        )) : (
          <div className="absolute inset-0 bg-ink-950" />
        )}

        {/* Gradient system — cinematic layering */}
        {/* Deep bottom lift */}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/65 to-transparent" />
        {/* Top atmospheric shadow */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950/55 via-transparent to-transparent" />
        {/* Side vignettes */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-ink-950/40 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-ink-950/40 to-transparent" />

        {/* ── Editorial top bar ── */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-5 pt-5">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-[9px] font-bold tracking-[0.24em] uppercase text-white/25 select-none"
          >
            St. John · USVI · 2026
          </motion.span>

          {/* Slide indicator dots */}
          {heroPhotos.length > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 0.5 }}
              className="flex items-center gap-1.5"
            >
              {heroPhotos.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setHeroIndex(i)}
                  className={`h-[3px] rounded-full transition-all duration-400 ${
                    i === heroIndex ? "w-6 bg-white" : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </motion.div>
          )}
        </div>

        {/* ── Main content — anchored to bottom ── */}
        <div className="relative h-full flex flex-col justify-end px-5 pb-7">

          {/* Location eyebrow — centered with ruled lines */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7, ease }}
            className="flex items-center gap-3 mb-5"
          >
            <div className="h-px flex-1 bg-white/18" />
            <span className="text-[9px] font-bold tracking-[0.24em] uppercase text-white/45 shrink-0">
              {(settings.property_location || "Chocolate Hole · St. John, USVI").replace(",", " ·")}
            </span>
            <div className="h-px flex-1 bg-white/18" />
          </motion.div>

          {/* Title — editorial scale */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.75, ease }}
            className="font-display tracking-tight leading-[0.87] mb-5"
          >
            <span className="block text-[4.5rem] font-medium text-white">Jordan's</span>
            <span className="block text-[4.5rem] font-medium text-white">40th.</span>
          </motion.h1>

          {/* Date badge */}
          {dateRange && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.5, ease }}
              className="mb-5"
            >
              <span className="inline-flex items-center gap-2 border border-white/18 rounded-full px-4 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-lagoon-400 shrink-0" />
                <span className="text-[11px] font-semibold text-white/55 tracking-wide">{dateRange} · 7 nights</span>
              </span>
            </motion.div>
          )}

          {/* Countdown */}
          {hasDate && !countdown.past && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.6, ease }}
              className="mb-4"
            >
              <div className="inline-flex items-end bg-white/[0.07] backdrop-blur-md border border-white/[0.10] rounded-2xl px-5 py-3.5 gap-0">
                <CountdownTile value={countdown.days} label="Days" />
                <span className="text-white/20 text-xl font-light pb-[14px] mx-2.5">:</span>
                <CountdownTile value={countdown.hours} label="Hrs" />
                <span className="text-white/20 text-xl font-light pb-[14px] mx-2.5">:</span>
                <CountdownTile value={countdown.minutes} label="Min" />
                <span className="text-white/20 text-xl font-light pb-[14px] mx-2.5">:</span>
                <CountdownTile value={countdown.seconds} label="Sec" />
              </div>
            </motion.div>
          )}

          {countdown.past && hasDate && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-papaya-400 font-display text-2xl italic mb-4"
            >
              We're here. 🎉
            </motion.p>
          )}

          {/* Weather teaser pill */}
          {weatherLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5, ease }}
              className="flex items-center gap-2.5 bg-white/[0.09] backdrop-blur-sm border border-white/[0.10] rounded-full px-4 py-2 self-start"
            >
              <div className="w-5 h-5 rounded-full bg-white/20 animate-pulse" />
              <div className="h-3 w-36 rounded-full bg-white/20 animate-pulse" />
            </motion.div>
          ) : (() => {
            const daysUntilTrip = checkIn
              ? Math.ceil((new Date(checkIn + "T00:00:00").getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : Infinity;
            const useLive = weatherData?.source === "live" && (weatherData.days?.length ?? 0) > 0 && daysUntilTrip <= 10;
            const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const todayDay = useLive
              ? (weatherData!.days.find(d => d.date === todayLabel) ?? weatherData!.days[0])
              : null;
            const teaserEmoji = todayDay ? todayDay.emoji : "☀️";
            const teaserText = todayDay
              ? `${todayDay.low}–${todayDay.high}°F · ${todayDay.label}`
              : "85–88°F · Mostly sunny, brief showers possible";
            return (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease }}
                className="flex items-center gap-2 bg-white/[0.09] backdrop-blur-sm border border-white/[0.10] rounded-full px-4 py-2 self-start"
              >
                <span className="text-[15px] leading-none">{teaserEmoji}</span>
                <span className="text-white/75 text-[12px] font-medium">{teaserText}</span>
              </motion.div>
            );
          })()}
        </div>

        {/* Horizon seam */}
        <div className="absolute bottom-0 left-0 right-0 translate-y-px">
          <HorizonWave />
        </div>
      </div>

      {/* ── BELOW THE FOLD ── */}
      <div className="px-5 pt-3 space-y-5">

        {/* Announcement — only if something real is written */}
        {announcement && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <div className="rounded-2xl bg-ink-900 px-5 py-4 shadow-card">
              <p className="text-[10px] font-bold text-brass-400/80 tracking-[0.18em] uppercase mb-2">
                From the organizer
              </p>
              <p className="text-sm text-white/80 leading-relaxed">{announcement}</p>
            </div>
          </motion.div>
        )}

        {/* Mini trip calendar */}
        {checkIn && checkOut && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease }}
          >
            <TripCalendar checkIn={checkIn} checkOut={checkOut} />
          </motion.div>
        )}

        {/* 7-day weather outlook */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, ease }}
        >
          <WeatherForecast data={weatherData} />
        </motion.div>

        {/* Quick links */}
        <div className="grid grid-cols-3 gap-2.5">
          {([
            { to: "/money", icon: Wallet, label: "Log expense", bg: "bg-lagoon-600/10", fg: "text-lagoon-600" },
            { to: "/travel", icon: Plane, label: "My flight", bg: "bg-papaya-500/10", fg: "text-papaya-600" },
            { to: "/explore", icon: Compass, label: "Explore", bg: "bg-brass-500/10", fg: "text-brass-600" },
          ] as const).map((a, i) => (
            <motion.div
              key={a.to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.06, duration: 0.4, ease }}
            >
              <Link to={a.to}>
                <div className="bg-white rounded-2xl shadow-card p-4 flex flex-col items-center gap-2 tap cursor-pointer">
                  <div className={`rounded-xl p-2.5 ${a.bg}`}>
                    <a.icon className={`h-5 w-5 ${a.fg}`} />
                  </div>
                  <span className="text-[11px] font-bold text-ink-900 tracking-wide uppercase">{a.label}</span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* First to land */}
        {upcomingArrivals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.45, ease }}
          >
            <Card className="shadow-card border-0">
              <CardContent className="p-5">
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-ink-900/30 tracking-[0.18em] uppercase mb-0.5">Arrivals</p>
                    <h2 className="font-display text-xl font-medium text-ink-950">First to land</h2>
                  </div>
                  <Link to="/travel">
                    <span className="flex items-center gap-1 text-xs font-bold text-lagoon-600 tracking-wide uppercase group">
                      All flights <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </div>
                <div className="space-y-3">
                  {upcomingArrivals.map((g, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-lagoon-600/10 flex items-center justify-center shrink-0">
                        <PlaneLanding className="w-4 h-4 text-lagoon-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-ink-900 truncate">
                          {householdName(g.householdId!)}
                        </p>
                        <p className="text-xs text-ink-900/40">
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

        {/* The ledger */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.45, ease }}
        >
          <Card className="shadow-card border-0">
            <CardContent className="p-5">
              <div className="flex items-end justify-between mb-1">
                <div>
                  <p className="text-[10px] font-bold text-ink-900/30 tracking-[0.18em] uppercase mb-0.5">Money</p>
                  <h2 className="font-display text-xl font-medium text-ink-950">The ledger</h2>
                </div>
                <p className="font-display text-2xl font-medium text-ink-950">
                  ${totalSpent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </p>
              </div>

              {targetBudget && (
                <div className="mt-3 mb-1">
                  <div className="flex justify-between text-xs text-ink-900/40 mb-1.5">
                    <span>Spent</span>
                    <span>${targetBudget.toLocaleString()} budgeted</span>
                  </div>
                  <Progress value={Math.min(100, (totalSpent / targetBudget) * 100)} className="h-1.5" />
                </div>
              )}

              {(balances as { householdId: number; householdName: string; netBalance: number }[]).length > 0 && (
                <div className="space-y-2.5 mt-5">
                  {(balances as { householdId: number; householdName: string; netBalance: number }[]).map((b) => (
                    <div key={b.householdId} className="flex justify-between items-center">
                      <span className="text-[13px] font-semibold text-ink-900">{b.householdName}</span>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        b.netBalance >= 0
                          ? "bg-lagoon-600/10 text-lagoon-600"
                          : "bg-papaya-500/10 text-papaya-600"
                      }`}>
                        {b.netBalance >= 0 ? "+" : ""}${Math.abs(Number(b.netBalance)).toFixed(0)}
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
                        <p className="text-xs text-ink-900/40 capitalize">
                          {e.category}{e.paidByHouseholdId ? ` · ${householdName(e.paidByHouseholdId)}` : ""}
                        </p>
                      </div>
                      <p className="text-[13px] font-bold text-ink-900">
                        ${Number(e.totalAmount).toFixed(0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <Link to="/money">
                <div className="flex items-center gap-1.5 text-xs font-bold text-lagoon-600 mt-5 tracking-wide uppercase group cursor-pointer">
                  Open full ledger
                  <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            </CardContent>
          </Card>
        </motion.div>

        {/* Group + individual photos */}
        {peoplePhotos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.45, ease }}
          >
            <div className="flex items-end justify-between mb-3 px-0.5">
              <div>
                <p className="text-[10px] font-bold text-ink-900/30 tracking-[0.18em] uppercase mb-0.5">The crew</p>
                <h2 className="font-display text-xl font-medium text-ink-950">Celebrating Jordan</h2>
              </div>
              <PartyPopper className="h-5 w-5 text-papaya-500 mb-0.5" />
            </div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1 -mx-5 px-5">
              {peoplePhotos.map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  whileTap={{ scale: 0.95 }}
                  className="h-52 w-40 object-cover rounded-2xl shrink-0 shadow-card"
                  style={{ objectPosition: "top center" }}
                  alt={`Photo ${i + 1}`}
                />
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
