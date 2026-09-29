"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AlertCircle, Truck, X } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { showMessageNotification } from "@/lib/desktop-notify";
import { cn } from "@/lib/utils";
import type { TripStatus } from "@/hooks/use-trips";

/** Payload of the backend's `tripStatusNotice` socket event. */
interface TripStatusNotice {
  kind: "STATUS" | "NOT_DEPARTED";
  tripId: string;
  truckId: string;
  title: string;
  plate: string;
  driverName: string;
  status: TripStatus;
}

// Solid banner colors, same hues as the status badges (TRIP_STATUS_COLORS).
const BANNER_BG: Record<TripStatus, string> = {
  ASSIGNED: "bg-blue-600",
  ACCEPTED: "bg-emerald-600",
  ON_WAY: "bg-yellow-600",
  ON_SITE: "bg-orange-600",
  LOADED: "bg-purple-600",
  DELIVERED: "bg-gray-600",
};

/**
 * Banner for a driver's trip-status change (accepted / on the way /
 * delivered …) or a driver who didn't confirm setting off after 3 reminders —
 * colored by status, with the trip's title. In-page toast while the tab is
 * open, plus a system notification (Windows toast in the desktop shell) when
 * the window isn't focused. Click → the truck. Renders nothing itself.
 */
export function TripStatusNotices() {
  const router = useRouter();
  const tStatus = useTranslations("common.tripStatus");
  const t = useTranslations("notifications");

  useEffect(() => {
    const socket = getSocket();
    const onNotice = (n: TripStatusNotice) => {
      const heading = `${n.plate ? `${n.plate} · ` : ""}${n.title}`;
      const line =
        n.kind === "NOT_DEPARTED"
          ? t("tripNotDeparted", { name: n.driverName })
          : `${n.driverName ? `${n.driverName}: ` : ""}${tStatus(n.status)}`;
      const open = () => router.push(`/trucks/${n.truckId}`);

      toast.custom(
        (id) => (
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              toast.dismiss(id);
              open();
            }}
            className={cn(
              "flex w-[356px] max-w-[calc(100vw-2rem)] cursor-pointer items-center gap-3 rounded-lg px-4 py-3 text-white shadow-lg",
              n.kind === "NOT_DEPARTED" ? "bg-red-600" : BANNER_BG[n.status],
            )}
          >
            {n.kind === "NOT_DEPARTED" ? (
              <AlertCircle className="h-5 w-5 shrink-0" />
            ) : (
              <Truck className="h-5 w-5 shrink-0" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{heading}</p>
              <p className="text-sm opacity-95">{line}</p>
            </div>
            <button
              type="button"
              aria-label="close"
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(id);
              }}
              className="shrink-0 opacity-80 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ),
        { duration: n.kind === "NOT_DEPARTED" ? 15000 : 6000 },
      );

      // Only fires when the window isn't focused (checked inside).
      showMessageNotification({ title: heading, body: line, onClick: open });
    };
    socket.on("tripStatusNotice", onNotice);
    return () => {
      socket.off("tripStatusNotice", onNotice);
    };
  }, [router, t, tStatus]);

  return null;
}
