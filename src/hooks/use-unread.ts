import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export interface UnreadTripEntry {
  tripId: string;
  unread: number;
}

export interface UnreadSummaryItem {
  truckId: string;
  plate: string;
  totalUnread: number;
  activeTripUnread: number;
  pastTripsUnread: number;
  /** { [tripId]: unreadCount } */
  tripUnread: Record<string, number>;
  latestMessage: {
    content: string;
    senderName: string;
    tripId: string;
    isActiveTrip: boolean;
    createdAt: string;
  } | null;
}

export interface UnreadSummary {
  total: number;
  items: UnreadSummaryItem[];
}

export const UNREAD_QUERY_KEY = ["unread-summary"] as const;

export function useUnreadSummary() {
  return useQuery<UnreadSummary>({
    queryKey: UNREAD_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get("/messages/unread");
      return res.data;
    },
    // Socket events (newMessage / tripMessagesRead) invalidate the cache
    // via useUnreadSocketSync. The summary is heavy on the backend, so we
    // don't poll on a fixed interval — the long staleTime stops React Query
    // from automatically re-fetching on remount / window-focus.
    staleTime: 60_000,
  });
}

/** Глобальний слухач сокету — інвалідує unread-summary при кожному
 *  новому повідомленні у будь-якому тріпі компанії. */
export function useUnreadSocketSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    // Was: socket.on("newMessage", ...) — backend used to re-broadcast
    // every chat message's full payload to the company room just so the
    // sidebar badge could invalidate. Now backend emits a lightweight
    // `tripUnreadChanged` event for that purpose; `newMessage` is sent
    // only to the actual trip room (participants viewing the chat).
    const onChange = () => {
      void queryClient.invalidateQueries({ queryKey: UNREAD_QUERY_KEY });
    };

    socket.on("tripUnreadChanged", onChange);
    socket.on("tripMessagesRead", onChange);

    return () => {
      socket.off("tripUnreadChanged", onChange);
      socket.off("tripMessagesRead", onChange);
    };
  }, [queryClient]);
}
