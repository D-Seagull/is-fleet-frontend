import { describe, expect, it } from "vitest";
import { hoursUntilNextHour } from "../status";

describe("hoursUntilNextHour", () => {
  it("counts to today's hour when it is still ahead", () => {
    const now = new Date(2026, 10, 28, 5, 0, 0);
    expect(hoursUntilNextHour(7, now)).toBeCloseTo(2, 5);
  });

  it("rolls over to tomorrow once the hour has passed", () => {
    const now = new Date(2026, 10, 28, 22, 30, 0);
    expect(hoursUntilNextHour(6, now)).toBeCloseTo(7.5, 5);
  });

  it("treats exactly the hour as passed", () => {
    const now = new Date(2026, 10, 28, 6, 0, 0);
    expect(hoursUntilNextHour(6, now)).toBeCloseTo(24, 5);
  });
});
