import { describe, expect, it } from "vitest";
import { IDLE_MS, isWindowInUse } from "../presence-pulse";

describe("isWindowInUse", () => {
  const now = 10_000_000;
  const base = { visible: true, focused: true, lastInputAt: now - 1_000, now };

  it("is in use while visible, focused and recently touched", () => {
    expect(isWindowInUse(base)).toBe(true);
  });

  it("stops once nobody touched it for IDLE_MS — the phone rings again", () => {
    expect(isWindowInUse({ ...base, lastInputAt: now - IDLE_MS })).toBe(false);
  });

  it("does not count a hidden / minimized window or one behind other apps", () => {
    expect(isWindowInUse({ ...base, visible: false })).toBe(false);
    expect(isWindowInUse({ ...base, focused: false })).toBe(false);
  });
});
