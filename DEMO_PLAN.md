# Demo Video Plan — under 3 minutes

Lead with the real-Bee-SDK moment. No third-party music or footage.

## 0:00–0:20 — The problem
"Your calendar knows what you planned. It doesn't know what your day actually became.
HAL 0001 is a time-aware intervention engine — it watches your commitments and acts
before you miss them, with every decision carrying its reason."

## 0:20–1:10 — Live run, scenario 1 (the Bee moment)
Terminal: `npm run demo`. Narrate: "HAL pulls my Bee todos through the real Bee SDK —
`createBeeClient`, called in code — sees 'Prep slides for Friday demo' with a 9am alarm,
and fires a preparation intervention an hour out." Show the printed decision + rationale.
Point at `src/beeAdapter.ts`: "real import, real call; fixture data behind it because
there's no device on this desk — and the code says so."

## 1:10–1:50 — Scenarios 2 and 3
Scenario 2: "Two commitments collide — the scheduler rejects the overlap and HAL
handles it routinely." Scenario 3: "Observation paused — HAL refuses to intervene,
and tells you why. That refusal is the feature."

## 1:50–2:30 — The receipts
`npm run typecheck` → 0 errors. `npm test` → 37/37 green. "The last attempt claimed
that and lied. This one you can run yourself."

## 2:30–3:00 — What's next
"Real Bee login, real calendar OAuth, learned prep durations. HAL's job is to know
what your day actually became — this is the first intervention."
