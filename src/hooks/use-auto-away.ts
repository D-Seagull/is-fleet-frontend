"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth";
import { useUpdateMe } from "@/hooks/use-avatar";

const IDLE_MS = 15 * 60 * 1000;
// Sweep every 30 s — coarse enough that we don't burn CPU but fine
// enough that the AWAY dot lands within ~30 s of crossing the threshold.
const CHECK_EVERY_MS = 30 * 1000;

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "scroll",
  "touchstart",
] as const;

/**
 * Auto-AWAY for managers / teamleads / admins. Watches mouse, keyboard
 * and touch activity; after 15 min of silence we flip the user to AWAY
 * (when they were ONLINE) and back to ONLINE the moment any activity is
 * seen while the status is AWAY.
 *
 * The revert check reads live status from the store rather than a "did
 * WE set this" flag, so it also recovers a stale AWAY left over from a
 * previous session/reload (status is persisted server-side and a plain
 * page reload doesn't touch it — only a fresh login resets it). Manual
 * BUSY / SLEEP / VACATION stay untouched by both the sweep and the
 * revert; only AWAY is considered "come back" territory.
 *
 * Drivers are skipped. For a driver, "no input for 15 min" means they
 * are driving the truck, which is the opposite of "not at the desk".
 */
export function useAutoAway() {
  const role = useAuthStore((s) => s.user?.role);
  const updateMe = useUpdateMe();
  // Dedupe: without this, a burst of mousemoves before the optimistic
  // status update commits would each pass the AWAY check and fire their
  // own mutate() call.
  const revertingRef = useRef(false);

  const enabled =
    role === "MANAGER" || role === "TEAMLEAD" || role === "ADMIN";

  useEffect(() => {
    if (!enabled) return;

    let lastActivity = Date.now();

    const onActivity = () => {
      lastActivity = Date.now();

      if (revertingRef.current) return;
      const current = useAuthStore.getState().user;
      if (current?.status === "AWAY") {
        revertingRef.current = true;
        updateMe.mutate(
          { status: "ONLINE" },
          { onSettled: () => { revertingRef.current = false; } },
        );
      }
    };

    const sweep = window.setInterval(() => {
      if (Date.now() - lastActivity < IDLE_MS) return;
      const current = useAuthStore.getState().user;
      // Respect anything other than ONLINE — the user chose to be
      // BUSY / SLEEP / VACATION themselves.
      if (current?.status !== "ONLINE") return;
      updateMe.mutate({ status: "AWAY" });
    }, CHECK_EVERY_MS);

    ACTIVITY_EVENTS.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );

    return () => {
      window.clearInterval(sweep);
      ACTIVITY_EVENTS.forEach((e) =>
        window.removeEventListener(e, onActivity),
      );
    };
  }, [enabled, updateMe]);
}
