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
    refetchInterval: 20_000,
    staleTime: 10_000,
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
    socket.on("messages_read", onRead);
    return () => {
      socket.off("new_direct_message", onNew);
      socket.off("messages_read", onRead);
    };
  }, [queryClient]);
}
