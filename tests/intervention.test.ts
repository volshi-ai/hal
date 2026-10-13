import { describe, it, expect } from "vitest";
import { TimeSource } from "../src/timeSource.js";
import { Scheduler } from "../src/scheduler.js";
import { ObservationControls } from "../src/observationControls.js";
import { TemporalEvaluator } from "../src/temporalEvaluator.js";
import { InterventionPolicy } from "../src/interventionPolicy.js";
import { HAL0001 } from "../src/hal0001.js";
import { ScenarioType } from "../src/scenario.js";

class FixedClock extends TimeSource {
  private readonly t: Date;
  constructor(iso: string) {
    super();
    this.t = new Date(iso);
  }
  override now(): Date {
    return new Date(this.t.getTime());
  }
}

function rig(overrides?: { paused?: boolean; hal?: HAL0001 }) {
  const clock = new FixedClock("2026-10-20T09:00:00Z");
  const scheduler = new Scheduler({ timeSource: clock });
  const controls = new ObservationControls(scheduler);
  if (overrides?.paused) controls.pause();
  const hal = overrides?.hal ?? new HAL0001();
  const evaluator = new TemporalEvaluator(clock, controls, hal);
  const policy = new InterventionPolicy(clock, controls, hal);
  return { evaluator, policy };
}

describe("TemporalEvaluator and InterventionPolicy", () => {
  it("fires leaveEarly for an upcoming meeting", () => {
    const { evaluator } = rig();
    const d = evaluator.evaluate({ type: ScenarioType.UpcomingMeeting, data: { breakInMinutes: 20 } });
    expect(d.action).toBe("leaveEarly");
    expect(d.rationale.blocked).toBe(false);
    expect(d.rationale.authorityClass).toBe("routine");
    expect(d.rationale.justification).toContain("20 min");
  });

  it("blocks when the meeting already started", () => {
    const { evaluator } = rig();
    const d = evaluator.evaluate({ type: ScenarioType.UpcomingMeeting, data: { breakInMinutes: -5 } });
    expect(d.action).toBeNull();
    expect(d.rationale.blocked).toBe(true);
  });

  it("handles overlaps routinely", () => {
    const { evaluator } = rig();
    const d = evaluator.evaluate({ type: ScenarioType.OverlappingCommitment, data: { overlapDuration: 30 } });
    expect(d.action).toBe("handleOverlap");
    expect(d.rationale.blocked).toBe(false);
  });

  it("fires startPrep for a preparation deadline", () => {
    const { evaluator } = rig();
    const d = evaluator.evaluate({ type: ScenarioType.PreparationDeadline, data: { dueInMinutes: 45 } });
    expect(d.action).toBe("startPrep");
    expect(d.rationale.blocked).toBe(false);
  });

  it("blocks calendar changes by default (not authorized)", () => {
    const { evaluator } = rig();
    const d = evaluator.evaluate({ type: ScenarioType.CalendarChange, data: { eventId: "evt-1" } });
    expect(d.action).toBeNull();
    expect(d.rationale.blocked).toBe(true);
    expect(d.rationale.justification).toContain("not authorized");
  });

  it("allows calendar changes when explicitly authorized", () => {
    const { evaluator } = rig({ hal: new HAL0001({ [ScenarioType.CalendarChange]: true }) });
    const d = evaluator.evaluate({ type: ScenarioType.CalendarChange, data: { eventId: "evt-1" } });
    expect(d.action).toBe("invalidatePlan");
    expect(d.rationale.authorityClass).toBe("exceptional");
    expect(d.rationale.blocked).toBe(false);
  });

  it("blocks on insufficient information", () => {
    const { evaluator } = rig();
    const d = evaluator.evaluate({ type: ScenarioType.InsufficientInformation, data: {} });
    expect(d.action).toBeNull();
    expect(d.rationale.blocked).toBe(true);
  });

  it("blocks everything while observation is paused", () => {
    const { evaluator } = rig({ paused: true });
    const d = evaluator.evaluate({ type: ScenarioType.UpcomingMeeting, data: { breakInMinutes: 20 } });
    expect(d.action).toBeNull();
    expect(d.rationale.blocked).toBe(true);
    expect(d.rationale.justification).toContain("paused");
  });

  it("policy delegates to the evaluator identically", () => {
    const { evaluator, policy } = rig();
    const scenario = { type: ScenarioType.PreparationDeadline, data: { dueInMinutes: 10 } } as const;
    expect(policy.decideScenario(scenario)).toEqual(evaluator.evaluate(scenario));
  });
});
