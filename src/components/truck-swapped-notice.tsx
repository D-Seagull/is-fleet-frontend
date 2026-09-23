"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSocket } from "@/lib/socket";
import { shortenTripTitle } from "@/components/truck-detail-panel/utils";

interface TruckSwapped {
  tripId: string;
  truckId: string;
  plate: string;
  title: string;
}

/**
 * Другий бік перецепу. Рейс лишається за менеджером — під ним міняється
 * вантажівка, і разом з нею панель, у якій цей рейс живе. Людина при цьому
 * нічого не натискала, тож про зміну треба сказати прямо, а не лишати її
 * гадати, чому чат раптом виглядає інакше.
 *
 * Перехід навмисно повний (`location.assign`), а не клієнтський: права на чати
 * щойно змінились на сервері, і найнадійніше перечитати їх із чистої сторінки.
 */
export function TruckSwappedNotice() {
  const t = useTranslations("truckPanel.trips.reassign");
  const [event, setEvent] = useState<TruckSwapped | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const onSwapped = (payload: TruckSwapped) => setEvent(payload);
    socket.on("tripTruckChanged", onSwapped);
    return () => {
      socket.off("tripTruckChanged", onSwapped);
    };
  }, []);

  if (!event) return null;

  return (
    <Dialog
      open
      onOpenChange={(next) => {
        if (!next) setEvent(null);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            {t("swappedTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("swappedBody", {
              trip: shortenTripTitle(event.title),
              plate: event.plate,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            onClick={() =>
              window.location.assign(`/trucks/${event.truckId}?tab=chat`)
            }
          >
            {t("swappedAction")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
