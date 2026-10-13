import { TemporalEvaluator } from "./temporalEvaluator.js";
import { ObservationControls } from "./observationControls.js";
import { TimeSource } from "./timeSource.js";
import { HAL0001 } from "./hal0001.js";
import { Scenario, Decision } from "./scenario.js";

/**
 * InterventionPolicy orchestrates the TemporalEvaluator and translates
 * decisions into actions. Side-effect execution (sending the email,
 * pushing the notification) is the caller's job — the policy decides,
 * it does not act. That separation is what keeps it testable.
 */
export class InterventionPolicy {
  private readonly evaluator: TemporalEvaluator;

  constructor(timeSource: TimeSource, controls: ObservationControls, hal: HAL0001) {
    this.evaluator = new TemporalEvaluator(timeSource, controls, hal);
  }

  decideScenario(scenario: Scenario): Decision {
    return this.evaluator.evaluate(scenario);
  }
}
