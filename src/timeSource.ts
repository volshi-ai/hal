/**
 * Injectable clock. Production code uses the real clock; tests inject
 * a fixed time so scenarios are deterministic.
 */
export class TimeSource {
  now(): Date {
    return new Date();
  }
}
