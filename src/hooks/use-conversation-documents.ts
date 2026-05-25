import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

export type FileDocType = "PHOTO" | "DOCUMENT";

export interface ConversationDocumentFull {
  id: string;
  uploadedBy: string;
  otherUserId: string;
  fileUrl: string;
  signedUrl: string;
  fileName: string;
  fileType: FileDocType;
  publicId: string | null;
  isRead: boolean;
  createdAt: string;
  uploader: { id: string; name: string | null; role: string };
  reactions?: { id: string; userId: string; emoji: string }[];
}

const QUERY_KEY = (otherUserId: string) => [
  "conversation-documents",
  otherUserId,
];

export function useConversationDocuments(otherUserId: string) {
  return useQuery<ConversationDocumentFull[]>({
    queryKey: QUERY_KEY(otherUserId),
    queryFn: async () => {
      const res = await api.get(
        `/direct-messages/documents/conversation/${otherUserId}`,
      );
      return res.data;
    },
    enabled: !!otherUserId,
  });
}

export function useUploadConversationDocs(otherUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (files: File[]) => {
      const form = new FormData();
      form.append("otherUserId", otherUserId);
      files.forEach((f) => form.append("files", f));
      const res = await api.post(
        "/direct-messages/documents/upload-many",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return res.data as ConversationDocumentFull[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(otherUserId) });
    },
  });
}

export function useDeleteConversationDoc(otherUserId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/direct-messages/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(otherUserId) });
    },
  });
}

// Real-time sync: listen for socket events and update cache.
export function useConversationDocsSocketSync(otherUserId: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!otherUserId) return;
    const socket = getSocket();
    const onNew = (doc: ConversationDocumentFull) => {
      // Only update cache if this document belongs to the open conversation.
      const belongs =
        (doc.uploadedBy && doc.otherUserId === otherUserId) ||
        (doc.otherUserId && doc.uploadedBy === otherUserId);
      if (!belongs) return;
      queryClient.setQueryData<ConversationDocumentFull[]>(
        QUERY_KEY(otherUserId),
        (prev = []) => {
          if (prev.some((d) => d.id === doc.id)) return prev;
          return [doc, ...prev];
        },
      );
    };
    const onDeleted = ({ id }: { id: string }) => {
      queryClient.setQueryData<ConversationDocumentFull[]>(
        QUERY_KEY(otherUserId),
        (prev = []) => prev.filter((d) => d.id !== id),
      );
    };
    socket.on("new_direct_document", onNew);
    socket.on("direct_document_deleted", onDeleted);
    return () => {
      socket.off("new_direct_document", onNew);
      socket.off("direct_document_deleted", onDeleted);
    };
  }, [otherUserId, queryClient]);
}
