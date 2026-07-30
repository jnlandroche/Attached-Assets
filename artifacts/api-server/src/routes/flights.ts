import { Router, type IRouter } from "express";

const router: IRouter = Router();

// ── Airline IATA code → name ──────────────────────────────────────────────────
const AIRLINES: Record<string, string> = {
  AA: "American Airlines",  UA: "United Airlines",    DL: "Delta Air Lines",
  WN: "Southwest Airlines", B6: "JetBlue Airways",    AS: "Alaska Airlines",
  F9: "Frontier Airlines",  NK: "Spirit Airlines",    G4: "Allegiant Air",
  HA: "Hawaiian Airlines",  AC: "Air Canada",         WS: "WestJet",
  BA: "British Airways",    VS: "Virgin Atlantic",    LH: "Lufthansa",
  AF: "Air France",         KL: "KLM",                IB: "Iberia",
  EK: "Emirates",           QR: "Qatar Airways",      EY: "Etihad Airways",
  SQ: "Singapore Airlines", CX: "Cathay Pacific",     JL: "Japan Airlines",
  NH: "All Nippon Airways", LA: "LATAM Airlines",     AM: "Aeromexico",
  CM: "Copa Airlines",      AV: "Avianca",
};

/** Parse IATA airline code from "AA 1234" / "AA1234" / "aa1234" */
function parseFlightNumber(raw: string): { iata: string; number: string } | null {
  const cleaned = raw.replace(/\s+/g, "").toUpperCase();
  const match = cleaned.match(/^([A-Z]{2})(\d{1,4}[A-Z]?)$/);
  if (!match) return null;
  return { iata: match[1], number: match[2] };
}

/**
 * GET /api/flight/lookup?flightNumber=AA1234&date=2026-10-17
 *
 * Returns scheduled flight info.  When AVIATIONSTACK_KEY is set the live
 * AviationStack API is called for richer data; otherwise we return what we
 * can derive from the IATA code alone.
 */
router.get("/flight/lookup", async (req, res): Promise<void> => {
  const raw = String(req.query.flightNumber ?? "").trim();
  const date = String(req.query.date ?? "").trim();

  if (!raw) {
    res.status(400).json({ error: "flightNumber is required" });
    return;
  }

  const parsed = parseFlightNumber(raw);
  if (!parsed) {
    res.status(422).json({ error: "Could not parse flight number — use format like AA1234 or DL 456" });
    return;
  }

  const airlineName = AIRLINES[parsed.iata] ?? null;
  const flightIata = `${parsed.iata}${parsed.number}`;

  // ── Live lookup via AviationStack ─────────────────────────────────────────
  const key = process.env.AVIATIONSTACK_KEY;
  if (key && date) {
    try {
      const url = new URL("http://api.aviationstack.com/v1/flights");
      url.searchParams.set("access_key", key);
      url.searchParams.set("flight_iata", flightIata);
      url.searchParams.set("flight_date", date);

      const resp = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
      if (resp.ok) {
        const body = (await resp.json()) as any;
        const flight = body?.data?.[0];
        if (flight) {
          const dep = flight.departure;
          const arr = flight.arrival;
          res.json({
            source: "live",
            flightIata,
            airline: airlineName ?? flight.airline?.name ?? parsed.iata,
            status: flight.flight_status ?? "scheduled",
            departure: {
              airport: dep?.airport ?? null,
              iata: dep?.iata ?? null,
              scheduled: dep?.scheduled ?? null,
              estimated: dep?.estimated ?? null,
              actual: dep?.actual ?? null,
            },
            arrival: {
              airport: arr?.airport ?? null,
              iata: arr?.iata ?? null,
              scheduled: arr?.scheduled ?? null,
              estimated: arr?.estimated ?? null,
              actual: arr?.actual ?? null,
            },
          });
          return;
        }
      }
    } catch {
      // fall through to derived result
    }
  }

  // ── Derived result (no API key or lookup failed) ──────────────────────────
  res.json({
    source: "derived",
    flightIata,
    airline: airlineName,
    status: null,
    departure: null,
    arrival: null,
    hint: key
      ? "Flight not found for that date — check the number and date."
      : "Add AVIATIONSTACK_KEY secret to enable automatic time lookups.",
  });
});

export default router;
