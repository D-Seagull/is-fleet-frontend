import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import type { Conversation } from "@/hooks/use-direct-messages";

export interface DmUnreadSummary {
  total: number;
  items: Conversation[];
}

export const DM_UNREAD_QUERY_KEY = ["dm-unread-summary"] as const;

export function useDmUnreadSummary() {
  return useQuery<DmUnreadSummary>({
    queryKey: DM_UNREAD_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get("/direct-messages/unread");
      return res.data;
    },
    // Cache is kept fresh by useDmUnreadSocketSync (new_direct_message /
    // messages_read). No fixed polling — long staleTime suppresses
    // automatic refetches on remount / window-focus.
    staleTime: 60_000,
  });
}

/** Global socket sync — invalidate DM unread summary on new DM or read events. */
export function useDmUnreadSocketSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const onNew = () => {
      void queryClient.invalidateQueries({ queryKey: DM_UNREAD_QUERY_KEY });
    };
    const onRead = () => {
      void queryClient.invalidateQueries({ queryKey: DM_UNREAD_QUERY_KEY });
    };
    socket.on("new_direct_message", onNew);
    // Attachments count toward unread too — invalidate on new documents so
    // the bell updates when a peer sends a file (not just a text message).
    socket.on("new_direct_document", onNew);
    socket.on("messages_read", onRead);
    return () => {
      socket.off("new_direct_message", onNew);
      socket.off("new_direct_document", onNew);
      socket.off("messages_read", onRead);
    };
  }, [queryClient]);
}
