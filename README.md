# 智健排班助手 (Smart Gym Scheduler)

Campus gym reservation app: students enter a training loop (ordered equipment segments + durations), the scheduler picks an entry time that avoids hot-equipment queues without changing order/duration, with waitlist, check-in and auto-release.

## Tech Stack
- Frontend: React + Vite + Tailwind CSS v4 + shadcn/ui, HashRouter, sonner toasts
- Backend: Express (CommonJS, flat `backend/` layout) + Drizzle ORM (postgres-js) + Zod
- DB: PostgreSQL (SQL migration with seed equipment data)
- No authentication in v1 (single demo student `demo-student`)

## Structure
```
backend/
  server.ts                    Express entry, mounts /api, static + SPA fallback
  db/schema.ts                 equipment, reservations (segments JSONB, partial unique index per user/day)
  db/migrations/*.sql          tables + seed equipment + seed reservations
  repositories/                equipmentRepository, reservationRepository
  services/scheduler.ts        pure scheduling algorithm (5-min step, capacity, load-balance cost, relax hint)
  services/reservationService.ts  submit/modify/cancel/check-in, waitlist rematch, no-show sweep, advisory locks
  routes/reservations.ts       GET /api/equipment, GET/POST /api/reservations, PUT /:id, POST /:id/cancel, /:id/check-in
shared/
  gym.ts                       GYM_RULES constants, helpers, status labels
  types/api.ts, types/reservation.ts   API contract types
frontend/src/
  pages/Index.tsx              home: current reservation timeline, heat panel, maintenance notices, quick actions
  pages/Reserve.tsx            create/edit reservation (uses ReservationForm)
  pages/Equipment.tsx          equipment library + detail (safety notes first)
  pages/NotFound.tsx           wildcard route
  components/custom/           AppShell, ReservationCard, ReservationForm
  hooks/use-gym-data.ts        loads equipment + reservations
  lib/api.ts, lib/date.ts, lib/unbuilt.ts
```

## Features (v1)
- Create / modify / cancel one reservation per day with validation (window >= plan length, <=12 segments, <=120 min, open period, maintenance equipment blocked)
- Scheduling: order/duration fixed, only entry time shifts; per-equipment and gym-wide capacity; waitlist with reason code and relax-30-min hint; automatic rematch on cancel/release
- Check-in window (-10/+15 min), auto-release of no-shows, late-cancel flag
- Equipment library with body-part filter, search, heat, maintenance status

## Deferred (marked via `data-omniflow-feature-status="unbuilt"`, only rendered in embedded preview)
Saved plans, teaching videos, message center, profile/login, admin console (schedule table, waitlist, maintenance, export, dashboard), accounts and audit logs.

## Conventions
- API responses: `{ success, data }`; shared types via `@shared/types/*` in frontend
- Deferred controls call `requestBuild()` from `lib/unbuilt.ts` (postMessage `OMNIFLOW_BUILD_FEATURE`)
