import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export interface GroupUnreadItem {
  groupId: string;
  name: string;
  unreadCount: number;
  latestMessage: {
    content: string;
    senderName: string | null;
    senderId: string;
    createdAt: string;
  } | null;
}

export interface GroupUnreadSummary {
  total: number;
  items: GroupUnreadItem[];
}

export const GROUP_UNREAD_QUERY_KEY = ["group-unread-summary"] as const;

export function useGroupUnreadSummary() {
  return useQuery<GroupUnreadSummary>({
    queryKey: GROUP_UNREAD_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get("/group-messages/unread");
      return res.data;
    },
    // Cache is kept fresh by useGroupUnreadSocketSync (new_group_message /
    // group_messages_read / group_unread_update). No fixed polling — long
    // staleTime suppresses automatic refetches on remount / window-focus.
    staleTime: 60_000,
  });
}

/** Mutation to mark all messages in a group as read. */
export function useMarkGroupRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (groupId: string) => {
      const res = await api.post(`/group-messages/${groupId}/read`);
      return res.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: GROUP_UNREAD_QUERY_KEY });
    },
  });
}

/** Global socket sync — invalidate on new group message or read events. */
export function useGroupUnreadSocketSync() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const socket = getSocket();
    const onNew = () => {
      void queryClient.invalidateQueries({ queryKey: GROUP_UNREAD_QUERY_KEY });
    };
    const onRead = () => {
      void queryClient.invalidateQueries({ queryKey: GROUP_UNREAD_QUERY_KEY });
    };
    socket.on("new_group_message", onNew);
    socket.on("group_messages_read", onRead);
    // Lightweight signal emitted by the backend to every group member's
    // personal room — fires even when the user isn't currently viewing the
    // group, so the unread counter updates on /trucks, /managers, etc.
    socket.on("group_unread_update", onNew);
    return () => {
      socket.off("new_group_message", onNew);
      socket.off("group_messages_read", onRead);
      socket.off("group_unread_update", onNew);
    };
  }, [queryClient]);
}
