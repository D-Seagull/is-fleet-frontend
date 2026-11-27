import { describe, it, expect } from "vitest";
import { hoursUntilNextHour, resolveDisplayStatus } from "@/lib/status";

describe("resolveDisplayStatus", () => {
  it("is OFFLINE when there is no live socket", () => {
    expect(resolveDisplayStatus({ status: "ONLINE" }, false)).toBe("OFFLINE");
  });

  it("is AWAY when offline but recently seen", () => {
    expect(resolveDisplayStatus({ status: "ONLINE" }, false, true)).toBe("AWAY");
  });

  it("shows ONLINE when connected and status is ONLINE", () => {
    expect(resolveDisplayStatus({ status: "ONLINE" }, true)).toBe("ONLINE");
  });

  it("keeps BUSY when connected and the timer has not expired", () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    expect(resolveDisplayStatus({ status: "BUSY", statusUntil: future }, true)).toBe("BUSY");
  });

  it("degrades an expired BUSY/SLEEP timer to ONLINE", () => {
    const past = new Date(Date.now() - 60_000).toISOString();
    expect(resolveDisplayStatus({ status: "SLEEP", statusUntil: past }, true)).toBe("ONLINE");
  });

  it("defaults a null user to ONLINE when connected", () => {
    expect(resolveDisplayStatus(null, true)).toBe("ONLINE");
  });
});

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
