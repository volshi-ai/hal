/**
 * Shared scenario/decision types for HAL 0001.
 * Lives in its own module so temporalEvaluator and hal0001 can both
 * import it without a circular dependency.
 */

export enum ScenarioType {
  UpcomingMeeting = "UpcomingMeeting",
  OverlappingCommitment = "OverlappingCommitment",
  PreparationDeadline = "PreparationDeadline",
  CalendarChange = "CalendarChange",
  InsufficientInformation = "InsufficientInformation",
}

/**
 * Why a decision came out the way it did. Always inspectable —
 * this is the audit trail HAL promises.
 */
export interface DecisionRationale {
  authorityClass: "routine" | "exceptional";
  justification: string;
  blocked: boolean;
}

export interface Decision {
  action: string | null;
  rationale: DecisionRationale;
}

export type Scenario =
  | { type: ScenarioType.UpcomingMeeting; data: { breakInMinutes: number } }
  | { type: ScenarioType.OverlappingCommitment; data: { overlapDuration: number } }
  | { type: ScenarioType.PreparationDeadline; data: { dueInMinutes: number } }
  | { type: ScenarioType.CalendarChange; data: { eventId: string } }
  | { type: ScenarioType.InsufficientInformation; data: {} };
