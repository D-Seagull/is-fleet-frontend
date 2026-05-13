"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getSocket } from "@/lib/socket";
import { alarmKeys } from "@/hooks/use-alarms";

interface FiredAlarm {
  id: string;
  title: string;
  note: string | null;
  tripId: string | null;
  time: string;
}

/**
 * Listens for `alarmFired` socket events emitted by the backend cron when
 * one of the current user's alarms is due. Shows a modal so the dispatcher
 * notices it even with the browser tab in the background.
 *
 * Mounted globally in app-layout so it works on every page.
 */
export function AlarmNoticeOverlay() {
  const queryClient = useQueryClient();
  const [fired, setFired] = useState<FiredAlarm | null>(null);

  useEffect(() => {
    const socket = getSocket();
    const onFired = (alarm: FiredAlarm) => {
      // Refresh lists in the background so the user sees the updated state
      // (isSent / next time for recurring) when they navigate to alarms.
      queryClient.invalidateQueries({ queryKey: alarmKeys.all });
      setFired(alarm);
      // Chime — autoplay may be blocked until the user has interacted with
      // the page; the modal still shows visually in that case.
      try {
        const a = new Audio("/sounds/is_alarm.mp3");
        a.volume = 0.8;
        void a.play();
      } catch {
        /* silent — sound is a nice-to-have */
      }
    };
    socket.on("alarmFired", onFired);
    return () => {
      socket.off("alarmFired", onFired);
    };
  }, [queryClient]);

  return (
    <Dialog open={!!fired} onOpenChange={(o) => !o && setFired(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {fired?.title}
          </DialogTitle>
          {fired?.note ? (
            <DialogDescription className="whitespace-pre-wrap">
              {fired.note}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => setFired(null)} className="w-full sm:w-auto">
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
