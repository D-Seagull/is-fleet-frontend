import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type FileDocType = "PHOTO" | "DOCUMENT";

export interface TripDocReplyPreview {
  id: string;
  content: string;
  deletedAt: string | null;
  sender: { id: string; name: string | null };
}

export interface TripDocReplyPreviewLite {
  id: string;
  fileName: string;
  fileType: FileDocType;
  deletedAt: string | null;
  uploader: { id: string; name: string | null };
}

export interface TripDocumentFull {
  id: string;
  tripId: string;
  fileUrl: string;
  signedUrl: string;
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
  uploader: { id: string; name: string | null; role: string };
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
    }: {
      tripId: string;
      files: File[];
      replyToMessageId?: string | null;
      replyToDocumentId?: string | null;
      caption?: string | null;
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
      });
      return res.data as TripDocumentFull[];
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(truckId) });
      queryClient.invalidateQueries({ queryKey: ["documents-trip", vars.tripId] });
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

