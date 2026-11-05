import type { TripStatus } from "@/hooks/use-trips";

/**
 * Tones for marks that aren't a trip status (notes as amber chips …). Colours
 * live in globals.css (`--tone-*`).
 */
export type StatusTone = "go" | "load" | "idle" | "warn" | "crit";

export const TONE_CLASS: Record<StatusTone, string> = {
  go: "bg-tone-go-bg text-tone-go",
  load: "bg-tone-load-bg text-tone-load",
  idle: "bg-tone-idle-bg text-tone-idle",
  warn: "bg-tone-warn-bg text-tone-warn",
  crit: "bg-tone-crit-bg text-tone-crit",
};

/**
 * Every trip status keeps its own colour — the same as in the mobile apps
 * (constants/trip-status.ts) and the status banners (trip-status-notices), so
 * a status reads the same on the phone and the desktop. The only place that
 * decides a trip status's colour on the web; `-400` text in dark mode keeps
 * the hue readable on graphite.
 */
export const TRIP_STATUS_CLASS: Record<TripStatus | "NONE", string> = {
  ASSIGNED: "bg-blue-500/12 text-blue-600 border-blue-500/30 dark:text-blue-400",
  ACCEPTED:
    "bg-emerald-500/12 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  ON_WAY: "bg-yellow-500/15 text-yellow-700 border-yellow-500/35 dark:text-yellow-400",
  ON_SITE: "bg-orange-500/12 text-orange-700 border-orange-500/30 dark:text-orange-400",
  LOADED: "bg-purple-500/12 text-purple-600 border-purple-500/30 dark:text-purple-400",
  DELIVERED: "bg-gray-500/12 text-gray-600 border-gray-500/30 dark:text-gray-400",
  // No trip on the truck.
  NONE: "bg-muted text-muted-foreground border-border",
};
