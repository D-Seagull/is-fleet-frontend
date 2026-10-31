import type { TripStatus } from "@/hooks/use-trips";

/**
 * One meaning = one colour, everywhere a status is drawn. Colours live in
 * globals.css (`--tone-*`); this is the only place that decides which tone a
 * status gets.
 */
export type StatusTone = "go" | "load" | "idle" | "warn" | "crit";

export const TONE_CLASS: Record<StatusTone, string> = {
  go: "bg-tone-go-bg text-tone-go",
  load: "bg-tone-load-bg text-tone-load",
  idle: "bg-tone-idle-bg text-tone-idle",
  warn: "bg-tone-warn-bg text-tone-warn",
  crit: "bg-tone-crit-bg text-tone-crit",
};

// Moving → go; waiting on loading/unloading (or about to set off for it) →
// load; finished → idle. "No trip" is idle too.
export const TRIP_STATUS_TONE: Record<TripStatus | "NONE", StatusTone> = {
  ASSIGNED: "load",
  ACCEPTED: "load",
  ON_WAY: "go",
  ON_SITE: "load",
  LOADED: "go",
  DELIVERED: "idle",
  NONE: "idle",
};
