"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

/**
 * Tells the backend whether the current browser tab is in the foreground.
 * The server uses this to decide whether a chat-message push is needed —
 * a tab in the background shouldn't suppress push delivery.
 */
export function useTabVisibilityPresence() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sock = getSocket();

    const emit = () => {
      if (!sock.connected) return;
      if (document.visibilityState === "visible") sock.emit("appActive");
      else sock.emit("appBackground");
    };

    emit();
    document.addEventListener("visibilitychange", emit);
    sock.on("connect", emit);

    return () => {
      document.removeEventListener("visibilitychange", emit);
      sock.off("connect", emit);
    };
  }, []);
}
