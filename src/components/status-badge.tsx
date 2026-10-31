import { cn } from "@/lib/utils";
import { TONE_CLASS, TRIP_STATUS_TONE } from "@/lib/status-tone";
import type { TripStatus } from "@/hooks/use-trips";

/**
 * A trip's status as a pill, coloured by its tone (lib/status-tone). The one
 * status look for lists, the chat header and the trip row.
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
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-xs font-semibold",
        TONE_CLASS[TRIP_STATUS_TONE[status]],
        className,
      )}
    >
      {children}
    </span>
  );
}
