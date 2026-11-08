"use client";

import { useEffect } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { appendInfiniteMessage } from "@/lib/infinite-messages";
import {
  onMessageDelivered,
  startMessageOutboxRunner,
} from "@/lib/message-outbox";
import { useAuthStore } from "@/store/auth";

const CACHE_KEY = {
  trip: "trip-messages",
  dm: "messages",
  group: "group-messages",
} as const;

/**
 * Mount once (inside the query provider): re-sends queued chat messages when
 * the connection is back, and drops each acknowledged message into its chat
 * cache — the room broadcast may have been missed while reconnecting.
 */
export function MessageOutboxRunner() {
  const qc = useQueryClient();
  const signedIn = useAuthStore((s) => !!s.user?.id);

  useEffect(() => {
    if (!signedIn) return;
    const stopRunner = startMessageOutboxRunner();
    const stopDelivered = onMessageDelivered((item, message) => {
      const msg = message as { id: string };
      qc.setQueryData<InfiniteData<{ id: string }[]>>(
        [CACHE_KEY[item.kind], item.scopeId],
        (prev) => (prev ? appendInfiniteMessage(prev, msg) : prev),
      );
      if (item.kind === "dm") {
        void qc.invalidateQueries({ queryKey: ["conversations"] });
      }
    });
    return () => {
      stopRunner();
      stopDelivered();
    };
  }, [signedIn, qc]);

  return null;
}
