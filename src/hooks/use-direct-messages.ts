import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const CHAT_INIT_QUERY_KEY = ["chat-init"] as const;

export interface MessageReplyPreview {
  id: string;
  content: string;
  deletedAt: string | null;
  sender: { id: string; firstName: string; lastName: string | null; avatar: string | null };
}

export interface DocReplyPreviewLite {
  id: string;
  fileName: string;
  fileType: "PHOTO" | "DOCUMENT";
  deletedAt: string | null;
  uploader: { id: string; firstName: string; lastName: string | null; avatar: string | null };
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  deletedAt?: string | null;
  editedAt?: string | null;
  replyToId?: string | null;
  replyTo?: MessageReplyPreview | null;
  replyToDocumentId?: string | null;
  replyToDocument?: DocReplyPreviewLite | null;
  sender: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
    status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
    statusUntil?: string | null;
    role: string;
  };
  reactions?: { id: string; userId: string; emoji: string }[];
}

export interface Conversation {
  user: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
    status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
    statusUntil?: string | null;
    role: string;
  };
  unreadCount: number;
  lastMessage: DirectMessage;
}

export function useConversations() {
  const queryClient = useQueryClient();
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get("/direct-messages/conversations");
      return res.data;
    },
    // On the /chat page useChatInit mounts in the same render tick and
    // seeds the conversations cache when its request resolves. If we just
    // rely on staleTime we still fetch on the first cold mount because
    // both queries see an empty cache. Skip the fetch when chat-init is
    // already present (or in-flight) — its setQueryData will populate us.
    // On other pages where chat-init never runs, getQueryState returns
    // undefined and the fetch happens as usual.
    enabled: !queryClient.getQueryState(CHAT_INIT_QUERY_KEY),
    staleTime: 60_000,
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

export function useDeleteDirectMessage() {
  return useMutation({
    mutationFn: async (messageId: string) => {
      await api.delete(`/direct-messages/messages/${messageId}`);
    },
  });
}

// Edits a DM message. The server broadcasts `dm_message_edited` so the cache
// patch is also handled by the gateway listener — but we patch optimistically
// here too so the bubble updates instantly for the editor.
export function useEditDirectMessage(otherUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await api.patch(`/direct-messages/messages/${id}`, {
        content,
      });
      return res.data as DirectMessage;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<DirectMessage[]>(
        ["messages", otherUserId],
        (old = []) => old.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
      );
    },
  });
}
export function useChatUser(userId: string) {
  return useQuery({
    queryKey: ["chat-user", userId],
    queryFn: async () => {
      const res = await api.get(`/users/${userId}`);
      return res.data as { id: string; firstName: string;
    lastName: string | null; avatar: string | null;
    status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
    statusUntil?: string | null; role: string };
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
