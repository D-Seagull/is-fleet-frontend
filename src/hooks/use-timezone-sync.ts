"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

/**
 * Pushes the browser's IANA timezone to the backend after login. Used by
 * AlarmsService to interpret a wall-clock alarm time on the *target* user's
 * clock — without this, dispatchers' alarms fall back to UTC and appear
 * shifted by the disp's offset.
 */
export function useBrowserTimezoneSync() {
  const user = useAuthStore((s) => s.user);
  const sentRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      sentRef.current = null;
      return;
    }
    let tz: string | undefined;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!tz) return;

    if (sentRef.current === tz) return;
    if (user.timezone === tz) {
      sentRef.current = tz;
      return;
    }

    api
      .patch("/users/me/timezone", { timezone: tz })
      .then(() => {
        sentRef.current = tz!;
      })
      .catch((e) => {
        console.warn("[tz] failed to push timezone", e);
      });
  }, [user?.id, user?.timezone]);
}
