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
 * (when they were ONLINE) and back to ONLINE as soon as they come
 * back — but only if the AWAY came from us. Manual BUSY / SLEEP /
 * VACATION / AWAY clicks win.
 *
 * Drivers are skipped. For a driver, "no input for 15 min" means they
 * are driving the truck, which is the opposite of "not at the desk".
 */
export function useAutoAway() {
  const role = useAuthStore((s) => s.user?.role);
  const updateMe = useUpdateMe();
  // True when WE flipped the user to AWAY automatically. We use it to
  // decide whether to revert on activity — and to skip manual AWAYs.
  const wasAutoAwayRef = useRef(false);

  const enabled =
    role === "MANAGER" || role === "TEAMLEAD" || role === "ADMIN";

  useEffect(() => {
    if (!enabled) return;

    let lastActivity = Date.now();

    const onActivity = () => {
      lastActivity = Date.now();

      // Fast path: 99 % of mousemoves hit this branch.
      if (!wasAutoAwayRef.current) return;

      // Restore only if the current status is still the AWAY we set;
      // a manual change since then (BUSY, SLEEP, …) wins.
      const current = useAuthStore.getState().user;
      if (current?.status === "AWAY") {
        updateMe.mutate({ status: "ONLINE" });
      }
      wasAutoAwayRef.current = false;
    };

    const sweep = window.setInterval(() => {
      if (wasAutoAwayRef.current) return;
      if (Date.now() - lastActivity < IDLE_MS) return;
      const current = useAuthStore.getState().user;
      // Respect anything other than ONLINE — the user chose to be
      // BUSY / SLEEP / VACATION / AWAY themselves.
      if (current?.status !== "ONLINE") return;
      wasAutoAwayRef.current = true;
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
