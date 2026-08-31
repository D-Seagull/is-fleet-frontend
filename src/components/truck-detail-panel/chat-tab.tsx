"use client";

import { useState } from "react";
import { Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import { useTripsByTruck } from "@/hooks/use-trips";
import { ACTIVE_STATUSES } from "./constants";
import { shortenTripTitle } from "./utils";
import { NewTripDialog } from "./new-trip-dialog";
import { TripCombobox } from "./trip-combobox";
import { TripChat } from "./trip-chat";

export function ChatTab({
  truckId,
  defaultDriverId,
  initialTripId,
  truckManagerId,
  navOpen = true,
}: {
  truckId: string;
  defaultDriverId?: string | null;
  initialTripId?: string | null;
  truckManagerId?: string | null;
  navOpen?: boolean;
}) {
  const t = useTranslations("chat");
  const tTrips = useTranslations("truckPanel.trips");
  const user = useAuthStore((s) => s.user);
  const { data: trips, isLoading } = useTripsByTruck(truckId);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    initialTripId ?? null,
  );
  const [selectorOpen, setSelectorOpen] = useState(false);

  const activeTrip = trips?.find((t) => ACTIVE_STATUSES.includes(t.status));
  const resolvedTripId = selectedTripId ?? activeTrip?.id ?? null;
  const selectedTrip = trips?.find((t) => t.id === resolvedTripId) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Mobile: compact bar with toggle + New Trip */}
      <div
        className={cn(
          "flex shrink-0 items-center gap-2 md:hidden",
          !navOpen && "hidden",
        )}
      >
        <button
          className="flex-1 flex items-center gap-1.5 rounded-md border bg-muted/40 px-2.5 h-8 text-xs text-left truncate"
          onClick={() => setSelectorOpen((v) => !v)}
        >
          <span className="truncate flex-1 text-muted-foreground">
            {selectedTrip
              ? shortenTripTitle(selectedTrip.title)
              : tTrips("selectTrip")}
          </span>
          {selectorOpen ? (
            <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
        </button>
        <NewTripDialog
          truckId={truckId}
          defaultDriverId={defaultDriverId}
          onCreated={(trip) => {
            setSelectedTripId(trip.id);
            setSelectorOpen(false);
          }}
        />
      </div>
      {/* Mobile: expanded selector */}
      {selectorOpen && navOpen && (
        <div className="md:hidden shrink-0">
          <TripCombobox
            trips={trips ?? []}
            value={resolvedTripId}
            onChange={(id) => {
              setSelectedTripId(id);
              setSelectorOpen(false);
            }}
            className="w-full"
          />
        </div>
      )}
      {selectedTrip ? (
        <TripChat
          trip={selectedTrip}
          truckId={truckId}
          currentUserId={user?.id ?? ""}
          truckManagerId={truckManagerId}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground">
          <p className="text-sm">{t("selectPrompt")}</p>
        </div>
      )}
    </div>
  );
}
