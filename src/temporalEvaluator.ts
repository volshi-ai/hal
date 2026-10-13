import { TimeSource } from "./timeSource.js";
import { ObservationControls } from "./observationControls.js";
import { HAL0001 } from "./hal0001.js";
import { Scenario, ScenarioType, Decision, DecisionRationale } from "./scenario.js";

/**
 * Deterministic temporal reasoning. Reads the clock, respects the
 * observation gate and the authorization boundary, then decides.
 * Every decision carries its rationale — the inspectable audit trail.
 */
export class TemporalEvaluator {
  constructor(
    private readonly timeSource: TimeSource,
    private readonly controls: ObservationControls,
    private readonly hal: HAL0001
  ) {}

  evaluate(scenario: Scenario): Decision {
    const now = this.timeSource.now();

    if (!this.controls.isEnabledAt(now)) {
      return this.blocked("Observation paused or outside permitted hours — intervention blocked");
    }

    if (!this.hal.isAuthorized(scenario.type)) {
      return this.blocked("External action not authorized by HAL boundary");
    }

    switch (scenario.type) {
      case ScenarioType.UpcomingMeeting: {
        const mins = scenario.data.breakInMinutes;
        if (mins < 0) return this.blocked(`Meeting already started (${mins} min break) — too late to intervene`);
        return this.routine("leaveEarly", `Upcoming meeting in ${mins} min — leave now`);
      }
      case ScenarioType.OverlappingCommitment:
        return this.routine(
          "handleOverlap",
          `Overlap of ${scenario.data.overlapDuration} min — routine handling`
        );
      case ScenarioType.PreparationDeadline: {
        const mins = scenario.data.dueInMinutes;
        if (mins < 0) return this.blocked("Preparation deadline already passed — intervention blocked");
        return this.routine("startPrep", `Preparation deadline ${mins} min away — start now`);
      }
      case ScenarioType.CalendarChange:
        return this.exceptional(
          "invalidatePlan",
          `Calendar change for event ${scenario.data.eventId} — prior plan may be invalid`
        );
      case ScenarioType.InsufficientInformation:
        return this.blocked("Insufficient information to decide — intervention blocked");
      default:
        return this.blocked("Unknown scenario — intervention blocked");
    }
  }

  private routine(action: string, justification: string): Decision {
    return { action, rationale: this.rationale("routine", justification, false) };
  }

  private exceptional(action: string, justification: string): Decision {
    return { action, rationale: this.rationale("exceptional", justification, false) };
  }

  private blocked(justification: string): Decision {
    return { action: null, rationale: this.rationale("exceptional", justification, true) };
  }

  private rationale(
    authorityClass: "routine" | "exceptional",
    justification: string,
    blocked: boolean
  ): DecisionRationale {
    return { authorityClass, justification, blocked };
  }
}
