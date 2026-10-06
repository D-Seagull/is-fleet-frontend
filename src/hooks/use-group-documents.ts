import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

export type FileDocType = "PHOTO" | "DOCUMENT";

export interface GroupDocReplyPreview {
  id: string;
  content: string;
  deletedAt: string | null;
  sender: { id: string; firstName: string; lastName: string | null; avatar: string | null };
}

export interface GroupDocReplyPreviewLite {
  id: string;
  fileName: string;
  fileType: FileDocType;
  /** Shared by files sent in one message (an album). */
  batchId?: string | null;
  deletedAt: string | null;
  uploader: { id: string; firstName: string; lastName: string | null; avatar: string | null };
}

export interface GroupDocumentFull {
  id: string;
  groupId: string;
  uploadedBy: string;
  fileUrl: string;
  signedUrl: string;
  // Small preview for bubbles and thumbnails; null for documents and for
  // photos uploaded before previews existed. Galleries use signedUrl.
  thumbUrl?: string | null;
  fileName: string;
  fileType: FileDocType;
  /** Shared by files sent in one message (an album). */
  batchId?: string | null;
  publicId: string | null;
  isRead: boolean;
  createdAt: string;
  deletedAt?: string | null;
  caption?: string | null;
  replyToMessageId?: string | null;
  replyTo?: GroupDocReplyPreview | null;
  replyToDocumentId?: string | null;
  replyToDocument?: GroupDocReplyPreviewLite | null;
  uploader: { id: string; firstName: string;
    lastName: string | null; avatar: string | null;
    status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
    statusUntil?: string | null; role: string };
  reactions?: { id: string; userId: string; emoji: string }[];
}

const QUERY_KEY = (groupId: string) => ["group-documents", groupId];

export function useGroupDocuments(groupId: string) {
  return useQuery<GroupDocumentFull[]>({
    queryKey: QUERY_KEY(groupId),
    queryFn: async () => {
      const res = await api.get(`/group-messages/documents/group/${groupId}`);
      return res.data;
    },
    enabled: !!groupId,
  });
}

export function useUploadGroupDocs(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      files,
      replyToMessageId,
      replyToDocumentId,
      caption,
      onProgress,
    }: {
      files: File[];
      replyToMessageId?: string | null;
      replyToDocumentId?: string | null;
      caption?: string | null;
      onProgress?: (percent: number) => void;
    }) => {
      const form = new FormData();
      form.append("groupId", groupId);
      if (replyToMessageId) form.append("replyToMessageId", replyToMessageId);
      if (replyToDocumentId)
        form.append("replyToDocumentId", replyToDocumentId);
      if (caption) form.append("caption", caption);
      files.forEach((f) => form.append("files", f));
      const res = await api.post(
        "/group-messages/documents/upload-many",
        form,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (e) => {
            if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
          },
        },
      );
      return res.data as GroupDocumentFull[];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(groupId) });
    },
  });
}

// Deletes the whole album `id` belongs to (just `id` when it isn't in one).
export function useDeleteGroupDocAlbum(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/group-messages/documents/${id}/album`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(groupId) });
    },
  });
}

export function useDeleteGroupDoc(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/group-messages/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(groupId) });
    },
  });
}

export function useGroupDocsSocketSync(groupId: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!groupId) return;
    const socket = getSocket();
    const onNew = (doc: GroupDocumentFull) => {
      if (doc.groupId !== groupId) return;
      queryClient.setQueryData<GroupDocumentFull[]>(
        QUERY_KEY(groupId),
        (prev = []) => {
          if (prev.some((d) => d.id === doc.id)) return prev;
          return [doc, ...prev];
        },
      );
    };
    const onDeleted = ({ id }: { id: string }) => {
      queryClient.setQueryData<GroupDocumentFull[]>(
        QUERY_KEY(groupId),
        (prev = []) =>
          prev.map((d) =>
            d.id === id
              ? { ...d, deletedAt: new Date().toISOString(), signedUrl: "" }
              : d,
          ),
      );
    };
    socket.on("new_group_document", onNew);
    socket.on("group_document_deleted", onDeleted);
    return () => {
      socket.off("new_group_document", onNew);
      socket.off("group_document_deleted", onDeleted);
    };
  }, [groupId, queryClient]);
}
