# HAL 0001 — Human Augmentation Layer

A time-aware intervention engine: it understands a person's temporal commitments,
recognizes impending conflicts and transitions, and fires appropriately bounded
interventions. Built for the Amazon Developer Hackathon — **Bee (Wearable AI)** track.

## Setup

```bash
npm install
```

Requires Node 20+.

## Scripts

```bash
npm run typecheck   # tsc --noEmit — must report 0 errors
npm test            # vitest run — 37 tests, all green
npm run demo        # deterministic demo, fixture Bee data (labeled)
npm run demo -- --live   # real Bee SDK path (needs `bee login`; throws BeeUnavailableError otherwise)
```

## Bee integration

`src/beeAdapter.ts` **really imports and calls the Bee SDK**: `createBeeClient()` from
`@beeai/cli/lib`. It reads recent conversations (`api.now`), todos (`api.todos.list`),
and daily summaries (`api.daily.list`), and turns Bee todos with alarms into
calendar commitments the engine can reason about.

No Bee device? The demo and CI use `fixtureBeeApi()` — clearly labeled fixture data,
per the organizers' guidance. The SDK import and invocation path in code is real;
only the data source swaps. To go live:

1. Install the Bee app, enable Developer Mode (tap the version 5x in Settings).
2. `npx -y @beeai/cli login` (or `npm i -g @beeai/cli`, then `bee login`).
3. `npm run demo -- --live`.

If Bee data can't be retrieved, the adapter throws `BeeUnavailableError` — it never
fabricates conversations, todos, or summaries.

## Architecture

```
TimeSource --> Scheduler --> ObservationControls --\
     |                                             v
     +--> TemporalEvaluator <-- HAL0001 (auth boundary)
                    |
         InterventionPolicy
                    |
     CalendarAdapter | BeeAdapter (@beeai/cli) | EmailAdapter (MOCK)
```

- **TimeSource** — injectable clock (fixed in tests/demo).
- **Scheduler** — entries, conflict detection (real Date comparison, not strings), upcoming windows.
- **ObservationControls** — pause + time-window gate; nothing fires while paused.
- **TemporalEvaluator** — deterministic scenario → decision, every decision carrying an inspectable rationale.
- **HAL0001** — authorization boundary (honest stub, labeled).
- **InterventionPolicy** — decides; it does not act. Side effects are the caller's job.

## Mocked / fixture components (labeled)

| Component | Status |
|---|---|
| EmailAdapter | MOCK — logs instead of sending |
| Bee data in demo/CI | FIXTURE — labeled; live path via `@beeai/cli` |
| CalendarAdapter | Fixtures, real logic |
| HAL0001 | Honest stub (allow-list) |

## Known limitations

1. No persistence — in-memory; events are lost on restart.
2. Recurrence DST edge — weekly/daily expansion steps in fixed 24h UTC increments; a DST transition shifts the wall-clock hour.
3. Single linear intervention policy — no priority chains or learned preferences yet.
4. Demo clock is fixed (2026-10-23T08:00:00Z, TZ pinned UTC) for reproducibility.

## Submission

- Track: **Bee (Wearable AI)**. License: MIT (Open Source mini-challenge).
- See `DEMO_PLAN.md` (video plan), `FEEDBACK.md` (product feedback), `FRICTION_LOG.md`.
