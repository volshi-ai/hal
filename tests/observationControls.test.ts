import { describe, it, expect } from "vitest";
import { Scheduler } from "../src/scheduler.js";
import { ObservationControls } from "../src/observationControls.js";
import { TimeEntry } from "../src/timeEntry.js";

const at = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date("2026-10-20T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
};

describe("ObservationControls", () => {
  it("is enabled inside the window", () => {
    const c = new ObservationControls(new Scheduler(), { window: { start: "08:00", end: "18:00" } });
    expect(c.isEnabledAt(at("09:00"))).toBe(true);
    expect(c.isEnabledAt(at("17:59"))).toBe(true);
  });

  it("is disabled outside the window", () => {
    const c = new ObservationControls(new Scheduler(), { window: { start: "08:00", end: "18:00" } });
    expect(c.isEnabledAt(at("07:59"))).toBe(false);
    expect(c.isEnabledAt(at("18:00"))).toBe(false);
    expect(c.isEnabledAt(at("23:00"))).toBe(false);
  });

  it("supports overnight windows", () => {
    const c = new ObservationControls(new Scheduler(), { window: { start: "22:00", end: "06:00" } });
    expect(c.isEnabledAt(at("23:30"))).toBe(true);
    expect(c.isEnabledAt(at("02:00"))).toBe(true);
    expect(c.isEnabledAt(at("12:00"))).toBe(false);
  });

  it("pausing blocks everything; resume restores", () => {
    const c = new ObservationControls(new Scheduler());
    expect(c.isPaused()).toBe(false);
    c.pause();
    expect(c.isPaused()).toBe(true);
    expect(c.isEnabledAt(at("12:00"))).toBe(false);
    c.resume();
    expect(c.isEnabledAt(at("12:00"))).toBe(true);
  });

  it("emits events when entries are added to the scheduler", () => {
    const scheduler = new Scheduler();
    const c = new ObservationControls(scheduler);
    const seen: TimeEntry[] = [];
    c.onEvent((e) => seen.push(e));
    scheduler.add({ id: "a", title: "a", start: "2026-10-20T09:00:00Z", end: "2026-10-20T10:00:00Z" });
    expect(seen).toHaveLength(1);
    expect(seen[0].id).toBe("a");
  });
});
