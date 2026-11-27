/**
 * Shared presence-status helpers used by sidebar pickers, list indicators
 * and chat headers. Backend stores three enum values; we render a fourth
 * (`OFFLINE`) when the viewer has no live socket — that one is computed
 * client-side, not stored.
 */

export type UserStatus =
  | "ONLINE"
  | "BUSY"
  | "AWAY"
  | "SLEEP"
  | "VACATION";
export type DisplayStatus = UserStatus | "OFFLINE";

/**
 * Resolve the displayed presence label for a user row. Falls through to
 * OFFLINE when `isOnline` is false (no live socket). Expired BUSY/SLEEP
 * timers degrade to ONLINE on the wire too — handled here as a safety
 * net so stale cached payloads still render correctly.
 */
export function resolveDisplayStatus(
  user:
    | {
        status?: UserStatus | null;
        statusUntil?: string | null;
      }
    | null
    | undefined,
  isOnline: boolean,
  // Offline but seen within the last week → amber "away"; older → grey OFFLINE.
  isAway = false,
): DisplayStatus {
  if (!isOnline) return isAway ? "AWAY" : "OFFLINE";
  const stored = user?.status ?? "ONLINE";
  if (stored === "ONLINE") return "ONLINE";
  if (user?.statusUntil) {
    const until = new Date(user.statusUntil).getTime();
    if (Number.isFinite(until) && until <= Date.now()) return "ONLINE";
  }
  return stored;
}

export const STATUS_COLOR: Record<DisplayStatus, string> = {
  ONLINE: "bg-emerald-500",
  BUSY: "bg-red-500",
  AWAY: "bg-amber-500",
  SLEEP: "bg-indigo-500",
  VACATION: "bg-yellow-500",
  OFFLINE: "bg-zinc-400 dark:bg-zinc-600",
};

export const STATUS_LABEL: Record<DisplayStatus, string> = {
  ONLINE: "Online",
  BUSY: "Не турбувати",
  AWAY: "Не на місці",
  SLEEP: "Сплю",
  VACATION: "Відпочиваю",
  OFFLINE: "Не в додатку",
};

/**
 * Hours from now until the NEXT occurrence of `hour`:00 local time — today if
 * it hasn't passed yet, otherwise tomorrow. Powers the "sleep until 6:00 / 7:00 /
 * 8:00" presets (statusUntil = now + this many hours).
 */
export function hoursUntilNextHour(hour: number, now: Date = new Date()): number {
  const target = new Date(now);
  target.setHours(hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return (target.getTime() - now.getTime()) / 3_600_000;
}
