# Friction Log

Kept during the build. Each entry: task, steps, expected vs actual, severity, workaround, suggestion.

## 1. @beeai/cli is ESM-only (no `require` condition)
- Task: import the Bee SDK into the project.
- Steps: `npm i @beeai/cli`, then `import { createBeeClient } from "@beeai/cli/lib"`.
- Expected: works under either module system. Actual: the package `exports` map only defines the `import` condition — `require("@beeai/cli/lib")` fails.
- Severity: medium.
- Workaround: made the whole project ESM (`"type": "module"`, `module`/`moduleResolution`: `NodeNext`, `.js` import extensions).
- Suggestion: ship a dual ESM/CJS build or add the `require` condition.

## 2. Demo observation window used machine-local time
- Task: run the deterministic demo.
- Steps: `npm run demo` with a fixed demo clock of 08:00Z and a 07:00–22:00 window.
- Expected: scenarios 1–2 fire interventions. Actual: both blocked — the container's local TZ made 08:00Z read as 04:00 local, outside the window. The gate logic was correct; the demo setup wasn't TZ-safe.
- Severity: low (demo-only), but it silently inverted the demo's meaning.
- Workaround: pin `process.env.TZ = "UTC"` at the top of `demo.ts`.
- Suggestion: none for the SDK — this was our bug, and the window logic now has an overnight-window test to prove it.

## 3. Our own test had wrong timezone math
- Task: regression test that the scheduler compares Dates, not ISO strings.
- Steps: wrote a mixed-offset test expecting no conflict.
- Expected: test passes. Actual: test failed — the implementation was right and my arithmetic was wrong (I claimed 13:30Z didn't overlap a 13:00–14:00Z entry; it does).
- Severity: low.
- Workaround: recomputed by hand and rewrote the test as a true discriminator (string comparison orders `"09:00:00+05:00"` after `"05:30:00Z"` and misses a real 04:30–05:00 overlap).
- Suggestion: verify test expectations independently of the implementation — a test that agrees with buggy code is worse than no test.

## 4. Bee CLI JSON shapes are undocumented
- Task: parse `api.now()` / `todos.list()` / `daily.list()` responses.
- Steps: read the `.d.ts` files — all payloads are `unknown` with no shape docs.
- Expected: documented response schemas. Actual: wrote ~60 lines of tolerant parsing (accepts `utterances`/`messages`/`transcript`, `alarm_at`/`alarmAt`, etc.).
- Severity: medium.
- Workaround: shape-tolerant parsers + degrade to empty (never fabricate).
- Suggestion: publish the JSON schemas or zod types alongside the SDK.
