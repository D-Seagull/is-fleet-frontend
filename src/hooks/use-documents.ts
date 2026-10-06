import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type FileDocType = "PHOTO" | "DOCUMENT";

export interface TripDocReplyPreview {
  id: string;
  content: string;
  deletedAt: string | null;
  sender: { id: string; firstName: string; lastName: string | null; avatar: string | null };
}

export interface TripDocReplyPreviewLite {
  id: string;
  fileName: string;
  fileType: FileDocType;
  deletedAt: string | null;
  /** Set when the quoted file is part of an album. */
  batchId?: string | null;
  uploader: { id: string; firstName: string; lastName: string | null; avatar: string | null };
}

export interface TripDocumentFull {
  id: string;
  tripId: string;
  fileUrl: string;
  signedUrl: string;
  // Small preview for bubbles and thumbnails; null for documents and for
  // photos uploaded before previews existed. Galleries use signedUrl.
  thumbUrl?: string | null;
  // Files sent together in one message share it (an album); null otherwise.
  batchId?: string | null;
  fileName: string;
  fileType: FileDocType;
  publicId: string | null;
  uploadedBy: string;
  isRead: boolean;
  createdAt: string;
  deletedAt?: string | null;
  caption?: string | null;
  replyToMessageId?: string | null;
  replyTo?: TripDocReplyPreview | null;
  replyToDocumentId?: string | null;
  replyToDocument?: TripDocReplyPreviewLite | null;
  uploader: { id: string; firstName: string;
    lastName: string | null; avatar: string | null;
    status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
    statusUntil?: string | null; role: string };
  trip?: {
    id: string;
    title: string;
    orderNumber: string | null;
    truck?: { id: string; plate: string };
  };
  reactions?: { id: string; userId: string; emoji: string }[];
}

const QUERY_KEY = (truckId: string) => ["documents-truck", truckId];

// All documents the current user can access (company-scoped on backend).
export function useAllDocuments() {
  return useQuery<TripDocumentFull[]>({
    queryKey: ["documents-all"],
    queryFn: async () => {
      const res = await api.get("/documents");
      return res.data;
    },
  });
}

export function useDocumentsByTrip(tripId: string) {
  return useQuery<TripDocumentFull[]>({
    queryKey: ["documents-trip", tripId],
    queryFn: async () => {
      const res = await api.get(`/documents/trip/${tripId}`);
      return res.data;
    },
    enabled: !!tripId,
  });
}

export function useDocumentsByTruck(truckId: string) {
  return useQuery<TripDocumentFull[]>({
    queryKey: QUERY_KEY(truckId),
    queryFn: async () => {
      const res = await api.get(`/documents/truck/${truckId}`);
      return res.data;
    },
    enabled: !!truckId,
  });
}

export function useUploadDocuments(truckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      tripId,
      files,
      replyToMessageId,
      replyToDocumentId,
      caption,
      onProgress,
    }: {
      tripId: string;
      files: File[];
      replyToMessageId?: string | null;
      replyToDocumentId?: string | null;
      caption?: string | null;
      onProgress?: (percent: number) => void;
    }) => {
      const form = new FormData();
      form.append("tripId", tripId);
      if (replyToMessageId) form.append("replyToMessageId", replyToMessageId);
      if (replyToDocumentId)
        form.append("replyToDocumentId", replyToDocumentId);
      if (caption) form.append("caption", caption);
      files.forEach((f) => form.append("files", f));
      const res = await api.post("/documents/upload-many", form, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100));
        },
      });
      return res.data as TripDocumentFull[];
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(truckId) });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
      queryClient.invalidateQueries({
        queryKey: ["documents-trip", vars.tripId],
      });
    },
  });
}

// Deletes the whole album `id` belongs to (just `id` when it isn't in one).
export function useDeleteDocumentAlbum(truckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}/album`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(truckId) });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    },
  });
}

export function useDeleteDocument(truckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(truckId) });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    },
  });
}

