import { cn } from "@/lib/utils";
import { TRIP_STATUS_CLASS } from "@/lib/status-tone";
import type { TripStatus } from "@/hooks/use-trips";

/**
 * A trip's status as a pill in that status's own colour (lib/status-tone) —
 * the same as on the phone. The one status look for lists and search.
 */
export function StatusBadge({
  status,
  className,
  children,
}: {
  status: TripStatus | "NONE";
  className?: string;
  /** The label — the caller translates it. */
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold",
        TRIP_STATUS_CLASS[status],
        className,
      )}
    >
      {children}
    </span>
  );
}
