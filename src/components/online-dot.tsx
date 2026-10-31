import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveDisplayStatus,
  STATUS_LABEL,
  type UserStatus,
} from "@/lib/status";
import { useUserPresence } from "@/hooks/use-presence";

type PresenceUser =
  | { id?: string; status?: UserStatus | null; statusUntil?: string | null }
  | null
  | undefined;

/** SLEEP / VACATION the person set and that hasn't run out yet. */
function restingStatus(user: PresenceUser): "SLEEP" | "VACATION" | null {
  const s = user?.status;
  if (s !== "SLEEP" && s !== "VACATION") return null;
  if (user?.statusUntil) {
    const until = new Date(user.statusUntil).getTime();
    if (Number.isFinite(until) && until <= Date.now()) return null;
  }
  return s;
}

/**
 * Green dot while the person is in the app and available; a moon / palm when
 * they set Sleep / Vacation (shown even with the app closed — that's when it
 * matters); nothing otherwise (pair it with <LastSeen always /> for the
 * offline case). Where a single mark is enough: My Trucks and the trip chat.
 * The full five-colour presence is <StatusDot>.
 */
export function OnlineDot({
  user,
  className,
}: {
  user: PresenceUser;
  className?: string;
}) {
  const online = useUserPresence(user?.id) === "online";
  const resting = restingStatus(user);
  if (resting === "SLEEP") {
    return (
      <span
        title={STATUS_LABEL.SLEEP}
        className={cn(
          "inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500",
          className,
        )}
      >
        <Moon className="h-2.5 w-2.5 text-white" />
      </span>
    );
  }
  if (resting === "VACATION") {
    return (
      <span
        title={STATUS_LABEL.VACATION}
        className={cn("shrink-0 text-sm leading-none", className)}
      >
        🌴
      </span>
    );
  }
  if (resolveDisplayStatus(user, online) !== "ONLINE") return null;
  return (
    <span
      title={STATUS_LABEL.ONLINE}
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full bg-presence-online", className)}
    />
  );
}
