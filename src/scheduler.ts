import { TimeEntry, isValidTimeEntry } from "./timeEntry.js";
import { TimeSource } from "./timeSource.js";

export interface SchedulerOptions {
  timeSource?: TimeSource;
}

export type EntryCallback = (entry: TimeEntry) => void;

function toDate(iso: string): Date {
  return new Date(iso);
}

/** True when the two entries' intervals intersect. Back-to-back (end == start) is NOT an overlap. */
export function intervalsOverlap(a: TimeEntry, b: TimeEntry): boolean {
  return toDate(a.start) < toDate(b.end) && toDate(b.start) < toDate(a.end);
}

export class Scheduler {
  private entries: TimeEntry[] = [];
  private subscribers: EntryCallback[] = [];
  private readonly timeSource: TimeSource;

  constructor(opts: SchedulerOptions = {}) {
    this.timeSource = opts.timeSource ?? new TimeSource();
  }

  /** Subscribe to entry additions. Replaces the old monkey-patching approach. */
  subscribe(cb: EntryCallback): void {
    this.subscribers.push(cb);
  }

  /**
   * Add an entry. Throws on invalid entries and on conflicts with
   * existing non-cancelled entries. Cancelled entries never conflict.
   */
  add(entry: TimeEntry): void {
    if (!isValidTimeEntry(entry)) {
      throw new Error("Invalid time entry: id/title/start/end required, start must be <= end");
    }
    if (!entry.cancelled) {
      for (const existing of this.entries) {
        if (!existing.cancelled && intervalsOverlap(existing, entry)) {
          throw new Error(`Entry conflicts with existing entry ${existing.id}`);
        }
      }
    }
    const stored = { ...entry };
    this.entries.push(stored);
    for (const cb of this.subscribers) cb({ ...stored });
  }

  getEntries(): TimeEntry[] {
    return this.entries.map((e) => ({ ...e }));
  }

  remove(id: string): boolean {
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx < 0) return false;
    this.entries.splice(idx, 1);
    return true;
  }

  /** Non-cancelled entries overlapping the given entry (excluding itself). */
  findConflicts(entry: TimeEntry): TimeEntry[] {
    return this.entries
      .filter((e) => e.id !== entry.id && !e.cancelled && intervalsOverlap(e, entry))
      .map((e) => ({ ...e }));
  }

  /** Non-cancelled entries starting within the next `minutes` from `from` (default now), sorted by start. */
  getUpcomingWithin(minutes: number, from?: Date): TimeEntry[] {
    const base = from ?? this.timeSource.now();
    const horizon = new Date(base.getTime() + minutes * 60_000);
    return this.entries
      .filter((e) => {
        if (e.cancelled) return false;
        const s = toDate(e.start);
        return s >= base && s <= horizon;
      })
      .sort((a, b) => toDate(a.start).getTime() - toDate(b.start).getTime())
      .map((e) => ({ ...e }));
  }

  now(): Date {
    return this.timeSource.now();
  }
}
