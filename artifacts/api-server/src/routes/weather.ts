import { Router, type IRouter } from "express";

const router: IRouter = Router();

// St. John, USVI coordinates
const LAT = 18.34;
const LON = -64.73;

const TRIP_START = new Date("2026-10-17T00:00:00-04:00");

// Historical October averages for St. John — shown until forecast is available (~10 days out)
const HISTORICAL_DAYS = [
  { dow: "Sat", date: "Oct 17", emoji: "⛅", label: "Partly Cloudy", high: 87, low: 78, rain: 20 },
  { dow: "Sun", date: "Oct 18", emoji: "☀️",  label: "Sunny",         high: 88, low: 77, rain:  5 },
  { dow: "Mon", date: "Oct 19", emoji: "☀️",  label: "Mostly Sunny",  high: 88, low: 78, rain: 10 },
  { dow: "Tue", date: "Oct 20", emoji: "🌦️", label: "Brief Shower",  high: 85, low: 77, rain: 45 },
  { dow: "Wed", date: "Oct 21", emoji: "⛅", label: "Partly Cloudy", high: 87, low: 78, rain: 20 },
  { dow: "Thu", date: "Oct 22", emoji: "☀️",  label: "Sunny",         high: 88, low: 77, rain:  5 },
  { dow: "Fri", date: "Oct 23", emoji: "☀️",  label: "Mostly Sunny",  high: 87, low: 77, rain: 10 },
  { dow: "Sat", date: "Oct 24", emoji: "⛅", label: "Partly Cloudy", high: 86, low: 78, rain: 25 },
];

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

interface ForecastDay {
  dow: string;
  date: string;
  emoji: string;
  label: string;
  high: number;
  low: number;
  rain: number;
}

interface CacheEntry {
  days: ForecastDay[];
  cachedUntil: string;
  expiresAt: number;
}

let forecastCache: CacheEntry | null = null;

function wmoToCondition(code: number): { emoji: string; label: string } {
  if (code === 0)                         return { emoji: "☀️",  label: "Sunny" };
  if (code === 1)                         return { emoji: "☀️",  label: "Mostly Sunny" };
  if (code === 2)                         return { emoji: "⛅", label: "Partly Cloudy" };
  if (code === 3)                         return { emoji: "☁️",  label: "Cloudy" };
  if (code >= 45 && code <= 48)           return { emoji: "🌫️", label: "Foggy" };
  if (code >= 51 && code <= 57)           return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 61 && code <= 67)           return { emoji: "🌧️", label: "Rainy" };
  if (code >= 80 && code <= 82)           return { emoji: "🌦️", label: "Brief Showers" };
  if (code >= 95 && code <= 99)           return { emoji: "⛈️", label: "Thunderstorm" };
  return { emoji: "🌤️", label: "Partly Sunny" };
}

router.get("/weather", async (_req, res): Promise<void> => {
  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilTrip = Math.floor((TRIP_START.getTime() - now.getTime()) / msPerDay);

  // Only fetch live forecast when the trip is within 10 days
  if (daysUntilTrip > 10) {
    res.json({ source: "historical", days: HISTORICAL_DAYS });
    return;
  }

  // Return cached response if still fresh
  if (forecastCache && now.getTime() < forecastCache.expiresAt) {
    res.json({ source: "live", days: forecastCache.days, cachedUntil: forecastCache.cachedUntil });
    return;
  }

  try {
    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${LAT}&longitude=${LON}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode` +
      `&temperature_unit=fahrenheit` +
      `&timezone=America%2FNew_York` +
      `&start_date=2026-10-17&end_date=2026-10-24`;

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Open-Meteo error: ${response.status}`);

    const data = (await response.json()) as {
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_probability_max: (number | null)[];
        weathercode: number[];
      };
    };

    const { time, temperature_2m_max, temperature_2m_min, precipitation_probability_max, weathercode } = data.daily;

    const days: ForecastDay[] = time.map((isoDate, i) => {
      const d = new Date(isoDate + "T12:00:00-04:00");
      const { emoji, label } = wmoToCondition(weathercode[i]);
      return {
        dow:  DOW[d.getDay()],
        date: `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`,
        emoji,
        label,
        high: Math.round(temperature_2m_max[i]),
        low:  Math.round(temperature_2m_min[i]),
        rain: precipitation_probability_max[i] ?? 0,
      };
    });

    const expiresAt = now.getTime() + CACHE_TTL_MS;
    const cachedUntil = new Date(expiresAt).toISOString();

    forecastCache = { days, cachedUntil, expiresAt };

    res.json({ source: "live", days, cachedUntil });
  } catch {
    // Always fall back to historical rather than breaking the UI
    // Serve stale cache if available rather than historical averages
    if (forecastCache) {
      res.json({ source: "live", days: forecastCache.days, cachedUntil: forecastCache.cachedUntil });
    } else {
      res.json({ source: "historical", days: HISTORICAL_DAYS });
    }
  }
});

export default router;
