import { ScenarioType } from "./scenario.js";

/**
 * HAL0001 — the authorization boundary. An explicitly-labeled honest stub:
 * in a real system this would be a policy engine or OAuth flow. For the
 * prototype it is a deterministic allow-list the tests can override.
 *
 * Default: routine scenarios allowed, exceptional ones denied.
 */
export class HAL0001 {
  private readonly allowed: Record<ScenarioType, boolean> = {
    [ScenarioType.UpcomingMeeting]: true,
    [ScenarioType.OverlappingCommitment]: true,
    [ScenarioType.PreparationDeadline]: true,
    [ScenarioType.CalendarChange]: false,
    [ScenarioType.InsufficientInformation]: false,
  };

  constructor(overrides?: Partial<Record<ScenarioType, boolean>>) {
    if (overrides) {
      Object.assign(this.allowed, overrides);
    }
  }

  isAuthorized(type: ScenarioType): boolean {
    return this.allowed[type] ?? false;
  }
}
