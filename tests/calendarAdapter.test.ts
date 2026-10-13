import { describe, it, expect } from "vitest";
import { CalendarAdapter } from "../src/calendarAdapter.js";
import { TimeEntry } from "../src/timeEntry.js";

const e = (id: string, start: string, end: string, extra: Partial<TimeEntry> = {}): TimeEntry => ({
  id, title: id, start, end, ...extra,
});

describe("CalendarAdapter", () => {
  it("throws on invalid fixtures", () => {
    const a = new CalendarAdapter();
    expect(() => a.loadFixtures([e("bad", "2026-10-20T11:00:00Z", "2026-10-20T10:00:00Z")])).toThrow(/Invalid TimeEntry/);
    expect(() => a.loadFixtures([{ title: "no-id", start: "2026-10-20T09:00:00Z", end: "2026-10-20T10:00:00Z" } as TimeEntry])).toThrow();
  });

  it("returns events overlapping the range, excluding others", () => {
    const a = new CalendarAdapter();
    a.loadFixtures([
      e("in", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"),
      e("out", "2026-10-21T09:00:00Z", "2026-10-21T10:00:00Z"),
    ]);
    const found = a.getEventsInRange("2026-10-20T00:00:00Z", "2026-10-20T23:59:59Z");
    expect(found.map((x) => x.id)).toEqual(["in"]);
  });

  it("throws on invalid interval bounds", () => {
    const a = new CalendarAdapter();
    a.loadFixtures([]);
    expect(() => a.getEventsInRange("not-a-date", "2026-10-20T23:59:59Z")).toThrow(/Invalid interval/);
  });

  it("filterCancelled removes cancelled events", () => {
    const a = new CalendarAdapter();
    const events = [e("a", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"), e("b", "2026-10-20T11:00:00Z", "2026-10-20T12:00:00Z", { cancelled: true })];
    expect(a.filterCancelled(events).map((x) => x.id)).toEqual(["a"]);
  });

  it("expands DAILY recurrence", () => {
    const a = new CalendarAdapter();
    a.loadFixtures([e("d", "2026-10-12T09:00:00Z", "2026-10-12T09:30:00Z", { recurrenceRule: "FREQ=DAILY" })]);
    const occ = a.getEventsInRange("2026-10-12T00:00:00Z", "2026-10-15T00:00:00Z");
    expect(occ).toHaveLength(3);
  });

  it("expands WEEKLY BYDAY for every listed weekday (regression: attempt-2 emitted zero)", () => {
    const a = new CalendarAdapter();
    // Base event is a Monday; BYDAY lists Tue/Thu. Old code emitted 0.
    a.loadFixtures([
      e("w", "2026-10-12T09:00:00Z", "2026-10-12T09:30:00Z", { recurrenceRule: "FREQ=WEEKLY;BYDAY=TU,TH" }),
    ]);
    const occ = a.getEventsInRange("2026-10-12T00:00:00Z", "2026-11-02T00:00:00Z");
    expect(occ).toHaveLength(6);
    const days = occ.map((o) => new Date(o.start).getUTCDay()).sort();
    expect(days).toEqual([2, 2, 2, 4, 4, 4]);
  });

  it("respects UNTIL in recurrence rules", () => {
    const a = new CalendarAdapter();
    a.loadFixtures([
      e("d", "2026-10-12T09:00:00Z", "2026-10-12T09:30:00Z", { recurrenceRule: "FREQ=DAILY;UNTIL=2026-10-13T09:00:00Z" }),
    ]);
    const occ = a.getEventsInRange("2026-10-12T00:00:00Z", "2026-10-20T00:00:00Z");
    expect(occ).toHaveLength(2);
  });

  it("returned events are copies — mutating them does not corrupt fixtures", () => {
    const a = new CalendarAdapter();
    a.loadFixtures([e("x", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z")]);
    const first = a.getEventsInRange("2026-10-20T00:00:00Z", "2026-10-20T23:59:59Z");
    first[0].title = "MUTATED";
    const second = a.getEventsInRange("2026-10-20T00:00:00Z", "2026-10-20T23:59:59Z");
    expect(second[0].title).toBe("x");
  });
});
