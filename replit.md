# Jordan's 40th — Trip Hub

A shared, no-login trip planning app for Jordan's 40th birthday in St. John, USVI. Everyone with the link can view and edit — no accounts, no passwords. Access control is the link itself.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/trip-hub run dev` — run the React frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Run seed: `npx --prefix artifacts/api-server tsx artifacts/api-server/src/seed.ts`
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + multer (receipt uploads)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind v4 + Framer Motion + wouter
- Validation: Zod v3, Orval codegen from OpenAPI spec
- Build: esbuild (API CJS bundle)

## Where things live

- `artifacts/trip-hub/` — React frontend (8 pages)
- `artifacts/api-server/` — Express backend
- `artifacts/api-server/public/images/` — bundled group and birthday photos
- `artifacts/api-server/uploads/` — uploaded receipt photos
- `artifacts/api-server/src/seed.ts` — seed script (real St. John data)
- `lib/db/src/schema/` — Drizzle schema (one file per table)
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)

## Pages

- `/` **Home** — Hero carousel, countdown, announcement, arrivals preview, expenses preview, birthday strip
- `/villa` **Villa** — Room assignment, amenities, check-in/out times, house rules, gallery
- `/crew` **Crew** — Group photos, household cards with room + travel info
- `/money` **Money** — Balances, expenses, split calculator (5 methods), settlement recommendations
- `/travel` **Travel** — Arrivals/departures board, editable flight status
- `/explore` **Explore** — Dining/Bars/Activities/Beaches/Boats/Coffee/Grocery guide
- `/weekend` **Weekend** — Editable vertical trip timeline
- `/need-to-know` **Info** — Emergency contacts, taxi, hospital, pharmacy

## Architecture decisions

- No authentication — open shared link by design
- Expense shares resolved client-side at write time, stored in `expense_shares` table
- Settlement algorithm: minimum-transaction (min-cash-flow) computed fresh on each `/api/settlements/recommendations` request
- Images served from Express static (`/api/images/`) — bundled at deploy time
- Receipt uploads to `/api/uploads/` via multer — 8MB limit
- Settings stored as key-value in `settings` table (no migrations needed to change trip dates/photos)
- `type: number` used in OpenAPI spec instead of `type: integer` — Orval 8.23.0 + Zod v3 incompatibility (see Gotchas)

## Product

A shared trip hub for 4 households (8 people) celebrating Jordan's 40th at Terrapin Station, Chocolate Hole, St. John USVI. Real seeded data: actual villa layout, verified restaurant/bar/beach names, real emergency numbers.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **Orval 8.23.0 + Zod v3**: Orval generates `zod.int()` for `type: integer` in OpenAPI, but that's a Zod v4 API. Workspace uses Zod `^3.25.76`. Always use `type: number` in the OpenAPI spec for integer fields.
- Seed script uses `npx --prefix artifacts/api-server tsx` — run from workspace root
- After OpenAPI spec changes, always run codegen before touching routes: `pnpm --filter @workspace/api-spec run codegen`
- API server `__dirname` resolves to `artifacts/api-server/dist/` at runtime — static paths are relative to that

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
