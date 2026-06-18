import { Moon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  resolveDisplayStatus,
  STATUS_COLOR,
  STATUS_LABEL,
  type DisplayStatus,
  type UserStatus,
} from "@/lib/status";

interface StatusDotProps {
  user:
    | {
        status?: UserStatus | null;
        statusUntil?: string | null;
      }
    | null
    | undefined;
  /** Most call sites can't tell on their own — they pass `true` if the
   *  viewer's app concept of "is this person around" is true, else false. */
  isOnline: boolean;
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
export function StatusDot({ user, isOnline, size = "sm", className }: StatusDotProps) {
  const status: DisplayStatus = resolveDisplayStatus(user, isOnline);
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
    </span>
  );
}
