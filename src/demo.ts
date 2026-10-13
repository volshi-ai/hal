/**
 * HAL 0001 demonstration — three deterministic scenarios, inspectable output.
 *
 *   npm run demo           fixture Bee data (labeled; organizer-blessed, no device needed)
 *   npm run demo -- --live real Bee SDK via @beeai/cli (needs `bee login`; throws BeeUnavailableError otherwise)
 *
 * The demo clock is fixed and TZ is pinned to UTC so the output is
 * reproducible run to run, on any machine.
 */
process.env.TZ = "UTC";

import { TimeSource } from "./timeSource.js";
import { Scheduler } from "./scheduler.js";
import { ObservationControls } from "./observationControls.js";
import { InterventionPolicy } from "./interventionPolicy.js";
import { HAL0001 } from "./hal0001.js";
import { CalendarAdapter } from "./calendarAdapter.js";
import { EmailAdapter } from "./emailAdapter.js";
import { BeeAdapter, fixtureBeeApi, BeeApiShape } from "./beeAdapter.js";
import { ScenarioType } from "./scenario.js";
import { TimeEntry } from "./timeEntry.js";

class DemoClock extends TimeSource {
  override now(): Date {
    return new Date("2026-10-23T08:00:00Z");
  }
}

const FIXTURES = {
  conversations: [
    {
      id: "conv-demo-1",
      started_at: "2026-10-22T15:00:00Z",
      utterances: [
        { speaker: "user", text: "I need to prep slides for Friday's demo, it's the big one", timestamp: "2026-10-22T15:01:00Z" },
      ],
    },
  ],
  todos: [
    { id: "todo-demo-1", text: "Prep slides for Friday demo", completed: false, alarm_at: "2026-10-23T09:00:00Z" },
  ],
  daily: [{ date: "2026-10-22", summary: "Calls all afternoon. Demo prep moved to Friday morning." }],
};

function buildEngine(beeApi: BeeApiShape) {
  const clock = new DemoClock();
  const scheduler = new Scheduler({ timeSource: clock });
  const controls = new ObservationControls(scheduler, { window: { start: "07:00", end: "22:00" } });
  const hal = new HAL0001();
  const policy = new InterventionPolicy(clock, controls, hal);
  const calendar = new CalendarAdapter();
  const bee = new BeeAdapter(beeApi);
  const email = new EmailAdapter();
  return { clock, scheduler, controls, policy, calendar, bee, email };
}

function show(title: string, obj: unknown): void {
  console.log(`\n--- ${title} ---`);
  console.log(JSON.stringify(obj, null, 2));
}

async function scenario1BeeTodoToIntervention(): Promise<void> {
  console.log("\n=== Scenario 1: Bee todo -> preparation intervention ===");
  const { policy, bee } = buildEngine(fixtureBeeApi(FIXTURES));

  const todos = await bee.getTodos();
  const todo = todos.find((t) => !t.completed && t.alarmAt);
  if (!todo?.alarmAt) {
    console.log("No actionable Bee todo found — nothing to do.");
    return;
  }
  console.log(`Bee todo: "${todo.text}" (alarm ${todo.alarmAt})`);

  // Turn the Bee todo into a calendar commitment: 30 min of prep ending at the alarm.
  const alarm = new Date(todo.alarmAt);
  const prep: TimeEntry = {
    id: "prep-from-bee",
    title: `Prep: ${todo.text}`,
    start: new Date(alarm.getTime() - 30 * 60_000).toISOString(),
    end: todo.alarmAt,
    preparationDurationMinutes: 30,
  };
  const dueInMinutes = Math.round((alarm.getTime() - new DemoClock().now().getTime()) / 60_000);
  const decision = policy.decideScenario({
    type: ScenarioType.PreparationDeadline,
    data: { dueInMinutes },
  });
  show("TimeEntry derived from Bee", prep);
  show("Decision", decision);
  console.log(`=> Action: ${decision.action ?? "(blocked)"} — ${decision.rationale.justification}`);
}

async function scenario2Overlap(): Promise<void> {
  console.log("\n=== Scenario 2: overlapping commitments -> conflict flagged ===");
  const { scheduler, policy, calendar } = buildEngine(fixtureBeeApi(FIXTURES));

  calendar.loadFixtures([
    { id: "standup", title: "Team standup", start: "2026-10-23T09:00:00Z", end: "2026-10-23T09:30:00Z" },
  ]);
  for (const evt of calendar.getEventsInRange("2026-10-23T00:00:00Z", "2026-10-23T23:59:59Z")) {
    scheduler.add(evt);
  }

  const clash: TimeEntry = {
    id: "dentist",
    title: "Dentist appointment",
    start: "2026-10-23T09:15:00Z",
    end: "2026-10-23T10:00:00Z",
  };
  try {
    scheduler.add(clash);
    console.log("ERROR: overlap was not detected");
  } catch (err) {
    console.log(`Scheduler rejected: ${(err as Error).message}`);
  }
  const conflicts = scheduler.findConflicts(clash);
  const overlapMin = 15;
  const decision = policy.decideScenario({
    type: ScenarioType.OverlappingCommitment,
    data: { overlapDuration: overlapMin },
  });
  show("Conflicting entries", conflicts.map((c) => c.title));
  show("Decision", decision);
  console.log(`=> Action: ${decision.action ?? "(blocked)"} — ${decision.rationale.justification}`);
}

async function scenario3Paused(): Promise<void> {
  console.log("\n=== Scenario 3: paused observation -> intervention blocked ===");
  const { controls, policy } = buildEngine(fixtureBeeApi(FIXTURES));
  controls.pause();

  const decision = policy.decideScenario({
    type: ScenarioType.UpcomingMeeting,
    data: { breakInMinutes: 20 },
  });
  show("Decision (observation paused)", decision);
  console.log(`=> Action: ${decision.action ?? "(blocked)"} — ${decision.rationale.justification}`);
  controls.resume();
}

async function main(): Promise<void> {
  const live = process.argv.includes("--live");
  console.log("==========================================================");
  console.log("  HAL 0001 — Human Augmentation Layer (demo)");
  console.log(`  Bee data source: ${live ? "LIVE (@beeai/cli)" : "FIXTURE (labeled; no device needed)"}`);
  console.log("==========================================================");

  if (live) {
    // Exercise the real SDK import path; throws BeeUnavailableError without login.
    const { BeeAdapter: LiveBee } = await import("./beeAdapter.js");
    const bee = new LiveBee(); // defaults to realBeeApi() -> createBeeClient()
    await bee.getTodos();
    console.log("Live Bee connection OK.");
    return;
  }

  await scenario1BeeTodoToIntervention();
  await scenario2Overlap();
  await scenario3Paused();

  console.log("\n==========================================================");
  console.log("Demo complete. All decisions carry inspectable rationales.");
}

main().catch((err) => {
  console.error("Demo failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
