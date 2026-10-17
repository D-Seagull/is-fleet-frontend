"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";
import { isWindowInUse, PULSE_MS } from "@/lib/presence-pulse";

const INPUT_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
] as const;

/**
 * Tells the backend while this window is in use (see `isWindowInUse`), so
 * pushes hold back: the phone stays quiet while the person works here, and
 * rings again within a minute once they leave the desk, switch to another
 * app or minimize the window.
 *
 * Pulses `appActive { pulse: true }` every PULSE_MS while in use and sends
 * `appBackground` once when that stops.
 */
export function useTabVisibilityPresence() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sock = getSocket();
    let lastInputAt = Date.now();
    let inUse = false;

    const check = (force = false) => {
      const now = isWindowInUse({
        visible: document.visibilityState === "visible",
        focused: document.hasFocus(),
        lastInputAt,
        now: Date.now(),
      });
      if (sock.connected) {
        if (now) sock.emit("appActive", { pulse: true });
        else if (inUse || force) sock.emit("appBackground");
      }
      inUse = now;
    };

    // Coming back to the window counts as being here — pulse at once, not on
    // the next tick, so a message sent right now doesn't buzz the phone.
    const onInput = () => {
      const wasInUse = inUse;
      lastInputAt = Date.now();
      if (!wasInUse) check();
    };
    const onWindowChange = () => {
      if (document.visibilityState === "visible" && document.hasFocus()) {
        lastInputAt = Date.now();
      }
      check();
    };
    // A fresh socket isn't "in use" on the server until it pulses.
    const onConnect = () => check(true);

    check(true);
    const timer = setInterval(() => check(), PULSE_MS);
    for (const e of INPUT_EVENTS) {
      window.addEventListener(e, onInput, { passive: true });
    }
    window.addEventListener("focus", onWindowChange);
    window.addEventListener("blur", onWindowChange);
    document.addEventListener("visibilitychange", onWindowChange);
    sock.on("connect", onConnect);

    return () => {
      clearInterval(timer);
      for (const e of INPUT_EVENTS) window.removeEventListener(e, onInput);
      window.removeEventListener("focus", onWindowChange);
      window.removeEventListener("blur", onWindowChange);
      document.removeEventListener("visibilitychange", onWindowChange);
      sock.off("connect", onConnect);
    };
  }, []);
}
