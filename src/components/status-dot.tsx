import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveDisplayStatus,
  STATUS_COLOR,
  STATUS_LABEL,
  type DisplayStatus,
  type UserStatus,
} from "@/lib/status";
import { useIsUserOnline } from "@/hooks/use-presence";

interface StatusDotProps {
  user:
    | {
        id?: string;
        status?: UserStatus | null;
        statusUntil?: string | null;
      }
    | null
    | undefined;
  /** Override the live presence lookup. Optional — when omitted (the
   *  common case) we read whether the user is online from the shared
   *  presence store maintained by usePresenceSync. */
  isOnline?: boolean;
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_PX: Record<NonNullable<StatusDotProps["size"]>, string> = {
  xs: "h-2 w-2",
  sm: "h-2.5 w-2.5",
  md: "h-3 w-3",
};

/**
 * Small colored dot in the bottom-right of an avatar. SLEEP gets a tiny
 * moon glyph inside instead of a solid dot so it reads as "asleep" at a
 * glance. Always wrapped with `title` so hover spelling-out the label
 * works even when the surrounding text doesn't repeat it.
 */
export function StatusDot({
  user,
  isOnline,
  size = "sm",
  className,
}: StatusDotProps) {
  // Read presence from the live store unless the caller explicitly
  // override it (e.g. an avatar where you always want the dot, like
  // your own profile preview).
  const livePresence = useIsUserOnline(user?.id);
  const effectiveOnline = isOnline ?? livePresence;
  const status: DisplayStatus = resolveDisplayStatus(user, effectiveOnline);
  const sizeClass = SIZE_PX[size];
  return (
    <span
      title={STATUS_LABEL[status]}
      className={cn(
        "inline-flex items-center justify-center rounded-full ring-2 ring-background",
        STATUS_COLOR[status],
        sizeClass,
        className,
      )}
    >
      {status === "SLEEP" && (
        <Moon
          className={cn(
            "text-white/90",
            size === "xs" ? "h-1.5 w-1.5" : size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
          )}
        />
      )}
      {status === "VACATION" && (
        // Emoji 🌴 — full color (brown trunk, green leaves) matches the
        // driver app and stays recognisable on a yellow background where
        // a single-color SVG palm would blur.
        <span
          className={cn(
            "leading-none",
            size === "xs" ? "text-[6px]" : size === "sm" ? "text-[8px]" : "text-[10px]",
          )}
        >
          🌴
        </span>
      )}
    </span>
  );
}
