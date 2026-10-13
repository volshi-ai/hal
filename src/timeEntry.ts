/**
 * Core calendar event representation.
 *
 * start/end are ISO 8601 strings. recurrenceRule uses a small RRULE subset:
 *   FREQ=DAILY | FREQ=WEEKLY ; BYDAY=MO,TU,WE,TH,FR,SA,SU ; UNTIL=<ISO>
 */

export interface TimeEntry {
  id: string;
  title: string;
  start: string;
  end: string;
  timezone?: string;
  recurrenceRule?: string;
  cancelled?: boolean;
  preparationDurationMinutes?: number;
  bufferDurationMinutes?: number;
}

/**
 * Structural validation. Parses the dates for real — string comparison
 * of ISO timestamps breaks with mixed timezone offsets, so we compare
 * Date values, not raw strings.
 */
export function isValidTimeEntry(entry: unknown): entry is TimeEntry {
  if (typeof entry !== "object" || entry === null) return false;
  const e = entry as Partial<TimeEntry>;
  if (typeof e.id !== "string" || e.id.length === 0) return false;
  if (typeof e.title !== "string" || e.title.length === 0) return false;
  if (typeof e.start !== "string" || typeof e.end !== "string") return false;
  const start = new Date(e.start);
  const end = new Date(e.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
  if (start > end) return false;
  return true;
}
