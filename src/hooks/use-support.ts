import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Admin support inbox — the "IS Fleet contact" account's 1-to-1 chats.
 * Admins read and answer as the contact. Polled (the contact has no socket
 * of its own); every admin page is low-traffic, so a few seconds is fine.
 */

export interface SupportPeer {
  id: string;
  firstName: string;
  lastName: string | null;
  avatar: string | null;
  role: string;
  phone?: string | null;
}

export interface SupportConversation {
  user: SupportPeer;
  lastMessage: {
    id: string;
    senderId: string;
    content: string;
    createdAt: string;
    deletedAt: string | null;
    isDocument?: boolean;
  };
  unreadCount: number;
}

export interface SupportMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  deletedAt: string | null;
}

export function useSupportConversations() {
  return useQuery<SupportConversation[]>({
    queryKey: ["support", "conversations"],
    queryFn: async () => (await api.get("/support/conversations")).data,
    refetchInterval: 15_000,
  });
}

export function useSupportMessages(userId: string | null) {
  return useQuery<SupportMessage[]>({
    queryKey: ["support", "messages", userId],
    queryFn: async () => (await api.get(`/support/${userId}`)).data,
    enabled: !!userId,
    refetchInterval: 5_000,
  });
}

export function useSupportMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) =>
      (await api.post(`/support/${userId}/read`)).data,
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["support", "conversations"] }),
  });
}

export function useSupportReply(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (content: string) =>
      (await api.post(`/support/${userId}`, { content })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support", "messages", userId] });
      qc.invalidateQueries({ queryKey: ["support", "conversations"] });
    },
  });
}
