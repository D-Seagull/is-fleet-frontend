import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    role: string;
  };
  reactions?: { id: string; userId: string; emoji: string }[];
}

export interface Conversation {
  user: {
    id: string;
    name: string | null;
    role: string;
  };
  unreadCount: number;
  lastMessage: DirectMessage;
}

export function useConversations() {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get("/direct-messages/conversations");
      return res.data;
    },
  });
}

export function useMessages(userId: string) {
  return useQuery<DirectMessage[]>({
    queryKey: ["messages", userId],
    queryFn: async () => {
      const res = await api.get(`/direct-messages/${userId}`);
      return res.data;
    },
    enabled: !!userId,
  });
}
export function useChatUser(userId: string) {
  return useQuery({
    queryKey: ["chat-user", userId],
    queryFn: async () => {
      const res = await api.get(`/users/${userId}`);
      return res.data as { id: string; name: string | null; role: string };
    },
    enabled: !!userId,
  });
}
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await api.post(`/direct-messages/${userId}/read`);
      return res.data;
    },
    onSuccess: (_, userId) => {
      // Просто інвалідуємо — React Query сам оновить
      queryClient.invalidateQueries({ queryKey: ["messages", userId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}
