import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type FileDocType = "PHOTO" | "DOCUMENT";

export interface TripDocumentFull {
  id: string;
  tripId: string;
  fileUrl: string;
  fileName: string;
  fileType: FileDocType;
  publicId: string | null;
  uploadedBy: string;
  createdAt: string;
  uploader: { id: string; name: string | null; role: string };
  trip?: { id: string; title: string; orderNumber: string | null };
}

const QUERY_KEY = (truckId: string) => ["documents-truck", truckId];

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
    mutationFn: async ({ tripId, files }: { tripId: string; files: File[] }) => {
      const form = new FormData();
      form.append("tripId", tripId);
      files.forEach((f) => form.append("files", f));
      const res = await api.post("/documents/upload-many", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data as TripDocumentFull[];
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(truckId) });
      queryClient.invalidateQueries({ queryKey: ["documents-trip", vars.tripId] });
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
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    },
  });
}

// Відкрити документ у браузері через Google Docs Viewer
export function getDocViewerUrl(fileUrl: string): string {
  return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=false`;
}

// Скачати фото як JPEG (image-ресурс Cloudinary)
export function getJpegDownloadUrl(fileUrl: string): string {
  return fileUrl.replace("/image/upload/", "/image/upload/fl_attachment,f_jpg/");
}

// Скачати фото як PDF (image-ресурс Cloudinary)
export function getImagePdfDownloadUrl(fileUrl: string): string {
  return fileUrl.replace("/image/upload/", "/image/upload/fl_attachment,f_pdf/");
}

// Відкрити документ напряму в браузері.
// Нормалізуємо URL: /image/upload/ → /raw/upload/ для PDF/DOCX.
export function getPdfViewUrl(fileUrl: string): string {
  return fileUrl.replace("/image/upload/", "/raw/upload/");
}

// Скачати документ через наш backend-проксі.
// Backend отримує файл з Cloudinary і повертає з правильними заголовками
// (Content-Disposition з оригінальним ім'ям файлу + розширенням).
export function getDocDownloadUrl(docId: string): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  return `${base}/documents/${docId}/download`;
}
