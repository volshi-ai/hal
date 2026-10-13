import { describe, it, expect } from "vitest";
import { Scheduler } from "../src/scheduler.js";
import { TimeEntry } from "../src/timeEntry.js";

const e = (id: string, start: string, end: string, extra: Partial<TimeEntry> = {}): TimeEntry => ({
  id, title: id, start, end, ...extra,
});

describe("Scheduler", () => {
  it("adds and lists entries", () => {
    const s = new Scheduler();
    s.add(e("a", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"));
    expect(s.getEntries()).toHaveLength(1);
    expect(s.getEntries()[0].id).toBe("a");
  });

  it("rejects invalid entries (start after end)", () => {
    const s = new Scheduler();
    expect(() => s.add(e("bad", "2026-10-20T11:00:00Z", "2026-10-20T10:00:00Z"))).toThrow(/Invalid time entry/);
  });

  it("rejects overlapping entries", () => {
    const s = new Scheduler();
    s.add(e("a", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"));
    expect(() => s.add(e("b", "2026-10-20T09:30:00Z", "2026-10-20T10:30:00Z"))).toThrow(/conflicts with existing entry a/);
  });

  it("allows back-to-back entries (end == start is not overlap)", () => {
    const s = new Scheduler();
    s.add(e("a", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"));
    expect(() => s.add(e("b", "2026-10-20T10:00:00Z", "2026-10-20T11:00:00Z"))).not.toThrow();
  });

  it("cancelled entries never conflict", () => {
    const s = new Scheduler();
    s.add(e("a", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z", { cancelled: true }));
    expect(() => s.add(e("b", "2026-10-20T09:30:00Z", "2026-10-20T10:30:00Z"))).not.toThrow();
  });

  it("findConflicts returns overlapping entries", () => {
    const s = new Scheduler();
    s.add(e("a", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"));
    s.add(e("b", "2026-10-20T12:00:00Z", "2026-10-20T13:00:00Z"));
    const conflicts = s.findConflicts(e("x", "2026-10-20T09:30:00Z", "2026-10-20T09:45:00Z"));
    expect(conflicts.map((c) => c.id)).toEqual(["a"]);
  });

  it("removes entries by id", () => {
    const s = new Scheduler();
    s.add(e("a", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"));
    expect(s.remove("a")).toBe(true);
    expect(s.remove("a")).toBe(false);
    expect(s.getEntries()).toHaveLength(0);
  });

  it("getUpcomingWithin returns sorted entries inside the window only", () => {
    const s = new Scheduler();
    s.add(e("late", "2026-10-20T14:00:00Z", "2026-10-20T15:00:00Z"));
    s.add(e("early", "2026-10-20T09:30:00Z", "2026-10-20T10:00:00Z"));
    s.add(e("past", "2026-10-20T07:00:00Z", "2026-10-20T08:00:00Z"));
    const upcoming = s.getUpcomingWithin(120, new Date("2026-10-20T09:00:00Z"));
    expect(upcoming.map((x) => x.id)).toEqual(["early"]);
  });

  it("notifies subscribers on add", () => {
    const s = new Scheduler();
    const seen: string[] = [];
    s.subscribe((entry) => seen.push(entry.id));
    s.add(e("a", "2026-10-20T09:00:00Z", "2026-10-20T10:00:00Z"));
    expect(seen).toEqual(["a"]);
  });

  it("compares dates as Dates, not strings (mixed offsets)", () => {
    const s = new Scheduler();
    // a: 09:00+05:00 == 04:00Z, ends 05:00Z. b: 04:30Z–05:30Z. Real overlap 04:30–05:00.
    // Lexicographic string comparison orders "09:00:00+05:00" after "05:30:00Z" and misses it.
    s.add(e("a", "2026-10-20T09:00:00+05:00", "2026-10-20T10:00:00+05:00"));
    expect(() => s.add(e("b", "2026-10-20T04:30:00Z", "2026-10-20T05:30:00Z"))).toThrow(/conflicts/);
  });
});
