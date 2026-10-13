import { Scheduler } from "./scheduler.js";
import { TimeEntry } from "./timeEntry.js";

export type EventCallback = (entry: TimeEntry) => void;

export interface ObservationWindow {
  /** "HH:MM" 24h local time, inclusive start */
  start: string;
  /** "HH:MM" 24h local time, exclusive end */
  end: string;
}

export interface ObservationControlsOptions {
  window?: ObservationWindow;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Gates every intervention: nothing fires while paused or outside the
 * observation window. Subscribes to the scheduler cleanly — no
 * monkey-patching.
 */
export class ObservationControls {
  private paused = false;
  private readonly window?: ObservationWindow;
  private callbacks: EventCallback[] = [];

  constructor(scheduler: Scheduler, opts: ObservationControlsOptions = {}) {
    this.window = opts.window;
    scheduler.subscribe((entry) => {
      for (const cb of this.callbacks) cb(entry);
    });
  }

  onEvent(cb: EventCallback): void {
    this.callbacks.push(cb);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }

  /** False when paused or outside the permitted window. */
  isEnabledAt(date: Date): boolean {
    if (this.paused) return false;
    if (!this.window) return true;
    const mins = date.getHours() * 60 + date.getMinutes();
    const start = toMinutes(this.window.start);
    const end = toMinutes(this.window.end);
    if (start <= end) return mins >= start && mins < end;
    // overnight window, e.g. 22:00–06:00
    return mins >= start || mins < end;
  }
}
