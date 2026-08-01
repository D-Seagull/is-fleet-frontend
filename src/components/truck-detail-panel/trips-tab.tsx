"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Paperclip,
  Loader2,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getSocket } from "@/lib/socket";
import { fullName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { StatusDot } from "@/components/status-dot";
import { cn } from "@/lib/utils";
import {
  useTripsByTruck,
  useUpdateTripStatus,
  TRIP_STATUS_COLORS,
  TRIP_STATUS_KEYS,
  type Trip,
  type TripStatus,
} from "@/hooks/use-trips";
import { shortenTripTitle } from "./utils";
import { NewTripDialog } from "./new-trip-dialog";
import { TripAttachmentsContent } from "./trip-attachments-content";

type TripVariant = "active" | "queued" | "done";

function TripCard({
  trip,
  truckId,
  onOpenTrip,
  unreadCount = 0,
  variant,
}: {
  trip: Trip;
  truckId: string;
  onOpenTrip: (id: string) => void;
  unreadCount?: number;
  variant: TripVariant;
}) {
  const t = useTranslations("truckPanel.trips");
  const tStatus = useTranslations("common.tripStatus");
  const updateStatus = useUpdateTripStatus(truckId);
  const [section, setSection] = useState<"stops" | "attachments" | null>(null);
  const allDocs = trip.documents;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card flex flex-col overflow-hidden",
        variant === "active" && "border-emerald-500/40 bg-emerald-500/5",
        variant === "done" && "opacity-60",
        unreadCount > 0 && "border-blue-500/30 bg-blue-500/5",
      )}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => onOpenTrip(trip.id)}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            variant === "active"
              ? "bg-emerald-500"
              : variant === "queued"
                ? "bg-amber-500"
                : "bg-muted-foreground/30",
          )}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-sm font-medium truncate">
              {shortenTripTitle(trip.title)}
              {trip.orderNumber && (
                <span className="text-muted-foreground font-normal">
                  {" "}
                  · #{trip.orderNumber}
                </span>
              )}
            </p>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1 leading-none shrink-0">
                {unreadCount}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <StatusDot user={trip.driver} size="xs" />
            {fullName(trip.driver)} ·{" "}
            {new Date(trip.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div
          className="flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant={section === "stops" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => setSection(section === "stops" ? null : "stops")}
          >
            <MapPin className="h-3 w-3" />
            {trip.stops.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {trip.stops.length}
              </span>
            )}
          </Button>
          <Button
            variant={section === "attachments" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs gap-1"
            onClick={() =>
              setSection(section === "attachments" ? null : "attachments")
            }
          >
            <Paperclip className="h-3 w-3" />
            {allDocs.length > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {allDocs.length}
              </span>
            )}
          </Button>
          <Select
            value={trip.status}
            onValueChange={(v) =>
              updateStatus.mutate({ id: trip.id, status: v as TripStatus })
            }
          >
            <SelectTrigger className="h-7 w-[110px] text-xs border-0 px-2 shadow-none focus:ring-0">
              <Badge
                variant="outline"
                className={TRIP_STATUS_COLORS[trip.status]}
              >
                {tStatus(trip.status)}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {TRIP_STATUS_KEYS.map((s) => (
                <SelectItem key={s} value={s}>
                  {tStatus(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {section === "stops" && (
        <div className="border-t px-4 py-3">
          {trip.stops.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("noStops")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted-foreground">
              {trip.stops
                .filter((s) => s.type === "LOADING")
                .map((s) => (
                  <span key={s.id} className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                    {s.address || "—"}
                  </span>
                ))}
              {trip.stops
                .filter((s) => s.type === "UNLOADING")
                .map((s) => (
                  <span key={s.id} className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                    {s.address || "—"}
                  </span>
                ))}
            </div>
          )}
        </div>
      )}
      {section === "attachments" && (
        <div className="border-t px-4 py-3">
          <TripAttachmentsContent
            tripId={trip.id}
            truckId={truckId}
            canDelete
            canUpload
          />
        </div>
      )}
    </div>
  );
}

export function TripsTab({
  truckId,
  defaultDriverId,
  onOpenTrip,
  tripUnread = {},
}: {
  truckId: string;
  defaultDriverId?: string | null;
  onOpenTrip: (tripId: string) => void;
  tripUnread?: Record<string, number>;
}) {
  const t = useTranslations("truckPanel.trips");
  const { data: trips, isLoading } = useTripsByTruck(truckId);
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  // Live-refresh the list when a driver (or another manager) changes a trip:
  // the backend emits `tripUpdated` to the company room this manager is in.
  useEffect(() => {
    const socket = getSocket();
    const invalidate = () =>
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    socket.on("tripUpdated", invalidate);
    return () => {
      socket.off("tripUpdated", invalidate);
    };
  }, [queryClient, truckId]);

  const filtered = trips?.filter((trip) => {
    const q = search.toLowerCase();
    return (
      trip.title.toLowerCase().includes(q) ||
      (trip.orderNumber ?? "").toLowerCase().includes(q) ||
      (fullName(trip.driver) || "").toLowerCase().includes(q)
    );
  });

  // Group by status so a pre-assigned upcoming trip reads as clearly separate
  // from the one in progress. Managers move a trip between sections just by
  // changing its status in the per-card dropdown. Section order is preserved.
  const IN_PROGRESS: TripStatus[] = ["ON_WAY", "ON_SITE", "LOADED"];
  const active: Trip[] = [];
  const queued: Trip[] = [];
  const done: Trip[] = [];
  for (const trip of filtered ?? []) {
    if (trip.status === "DELIVERED") done.push(trip);
    else if (IN_PROGRESS.includes(trip.status)) active.push(trip);
    else queued.push(trip);
  }
  const sections: { key: string; label: string; list: Trip[]; variant: TripVariant }[] = [
    { key: "active", label: t("sectionActive"), list: active, variant: "active" },
    { key: "queued", label: t("sectionQueued"), list: queued, variant: "queued" },
    { key: "done", label: t("sectionDone"), list: done, variant: "done" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <NewTripDialog
          truckId={truckId}
          defaultDriverId={defaultDriverId}
          onCreated={(trip) => onOpenTrip(trip.id)}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !trips || trips.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">
          {t("empty")}
        </p>
      ) : filtered?.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">
          {t("nothingFound")}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {sections
            .filter((s) => s.list.length > 0)
            .map((s) => (
              <div key={s.key} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 px-0.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {s.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground/60">
                    {s.list.length}
                  </span>
                </div>
                {s.list.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    truckId={truckId}
                    onOpenTrip={onOpenTrip}
                    unreadCount={tripUnread[trip.id] ?? 0}
                    variant={s.variant}
                  />
                ))}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
