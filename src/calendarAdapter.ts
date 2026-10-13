import { TimeEntry, isValidTimeEntry } from "./timeEntry.js";

/**
 * Deterministic calendar facade: fixtures in, expanded occurrences out.
 * No external dependencies — pure Date math.
 */

const WEEKDAY_INDEX: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

interface ParsedRule {
  freq: "DAILY" | "WEEKLY";
  byDays: number[];
  until: Date | null;
}

function parseRule(rule: string): ParsedRule | null {
  const freqMatch = rule.match(/FREQ=(DAILY|WEEKLY)/);
  if (!freqMatch) return null;
  const byDayMatch = rule.match(/BYDAY=([^;]+)/);
  const byDays = byDayMatch
    ? byDayMatch[1].split(",").map((d) => WEEKDAY_INDEX[d.trim()]).filter((n) => n !== undefined)
    : [];
  const untilMatch = rule.match(/UNTIL=([^;]+)/);
  const until = untilMatch ? new Date(untilMatch[1]) : null;
  if (until && isNaN(until.getTime())) return null;
  return { freq: freqMatch[1] as "DAILY" | "WEEKLY", byDays, until };
}

/**
 * Expand a recurring event across [rangeStart, rangeEnd].
 *
 * Correctness note (this was broken in attempt 2): for WEEKLY we walk
 * day-by-day and emit an occurrence for EVERY listed BYDAY weekday in
 * range — never silently zero. Time-of-day is taken from the base event.
 * DST edge: days are fixed 24h steps in UTC; a spring-forward/fall-back
 * day shifts the wall-clock hour. Documented in README as a limitation.
 */
function expandRecurrence(evt: TimeEntry, rangeStart: Date, rangeEnd: Date): TimeEntry[] {
  if (!evt.recurrenceRule) return [];
  const rule = parseRule(evt.recurrenceRule);
  if (!rule) return [];

  const baseStart = new Date(evt.start);
  const durationMs = new Date(evt.end).getTime() - baseStart.getTime();
  const effectiveEnd = rule.until && rule.until < rangeEnd ? rule.until : rangeEnd;
  const occurrences: TimeEntry[] = [];

  // Walk day-by-day from the later of (base date, range start).
  const dayStart = new Date(
    Math.max(
      Date.UTC(baseStart.getUTCFullYear(), baseStart.getUTCMonth(), baseStart.getUTCDate()),
      Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate())
    )
  );
  const lastDay = new Date(
    Date.UTC(effectiveEnd.getUTCFullYear(), effectiveEnd.getUTCMonth(), effectiveEnd.getUTCDate())
  );

  for (let d = new Date(dayStart); d <= lastDay; d = new Date(d.getTime() + 86_400_000)) {
    if (rule.freq === "WEEKLY" && !rule.byDays.includes(d.getUTCDay())) continue;
    const occStart = new Date(
      Date.UTC(
        d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(),
        baseStart.getUTCHours(), baseStart.getUTCMinutes(),
        baseStart.getUTCSeconds(), baseStart.getUTCMilliseconds()
      )
    );
    if (occStart < baseStart) continue;
    if (rule.until && occStart > rule.until) continue;
    const occEnd = new Date(occStart.getTime() + durationMs);
    if (occEnd < rangeStart || occStart > rangeEnd) continue;
    occurrences.push({
      ...evt,
      id: `${evt.id}#${occStart.toISOString().slice(0, 10)}`,
      start: occStart.toISOString(),
      end: occEnd.toISOString(),
      recurrenceRule: undefined,
    });
  }
  return occurrences;
}

export class CalendarAdapter {
  private fixtures: TimeEntry[] = [];

  /** Load fixtures, replacing any previous set. Throws on malformed entries. */
  loadFixtures(fixtures: TimeEntry[]): void {
    for (const e of fixtures) {
      if (!isValidTimeEntry(e)) {
        throw new Error(`Invalid TimeEntry fixture: ${JSON.stringify(e)}`);
      }
    }
    this.fixtures = fixtures.map((e) => ({ ...e }));
  }

  /** All events (expanded) overlapping [startISO, endISO]. Returns copies. */
  getEventsInRange(startISO: string, endISO: string): TimeEntry[] {
    const rangeStart = new Date(startISO);
    const rangeEnd = new Date(endISO);
    if (isNaN(rangeStart.getTime()) || isNaN(rangeEnd.getTime())) {
      throw new Error("Invalid interval bounds");
    }
    const results: TimeEntry[] = [];
    for (const evt of this.fixtures) {
      if (evt.recurrenceRule) {
        results.push(...expandRecurrence(evt, rangeStart, rangeEnd));
      } else {
        const s = new Date(evt.start);
        const e = new Date(evt.end);
        if (e < rangeStart || s > rangeEnd) continue;
        results.push({ ...evt });
      }
    }
    return results;
  }

  filterCancelled(events: TimeEntry[]): TimeEntry[] {
    return events.filter((e) => !e.cancelled);
  }
}
