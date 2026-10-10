"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";

/**
 * Keeps the page in step with the server across socket outages.
 *
 *  - Back after a drop: whatever the socket missed meanwhile (trip status
 *    changes, new messages, presence) is not replayed, so refetch the data
 *    on screen. Only active queries refetch, once — after a random 0–5 s
 *    delay: a backend deploy drops every client at the same moment, and
 *    without the jitter they would all refetch in the same second.
 *  - Network back / tab shown again: if the socket is down, connect now
 *    instead of waiting out the backoff (up to 10 s).
 */
const RESYNC_JITTER_MS = 5_000;

export function useSocketResync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    let resyncTimer: ReturnType<typeof setTimeout> | undefined;
    const onReconnect = () => {
      clearTimeout(resyncTimer);
      resyncTimer = setTimeout(
        () => void queryClient.invalidateQueries(),
        Math.random() * RESYNC_JITTER_MS,
      );
    };
    const wake = () => {
      if (!socket.connected && document.visibilityState === "visible") {
        socket.connect();
      }
    };
    socket.io.on("reconnect", onReconnect);
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearTimeout(resyncTimer);
      socket.io.off("reconnect", onReconnect);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [queryClient]);
}
