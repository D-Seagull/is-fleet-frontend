import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TripStatus =
  | "ASSIGNED"
  | "ACCEPTED"
  | "ON_WAY"
  | "ON_SITE"
  | "LOADED"
  | "DELIVERED";

export type StopType = "LOADING" | "UNLOADING";

export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  ASSIGNED: "Assigned",
  ACCEPTED: "Accepted",
  ON_WAY: "On Way",
  ON_SITE: "On Site",
  LOADED: "Loaded",
  DELIVERED: "Delivered",
};

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  ASSIGNED: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  ACCEPTED: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ON_WAY: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  ON_SITE: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  LOADED: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  DELIVERED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export interface TripStop {
  id: string;
  tripId: string;
  type: StopType;
  order: number;
  address: string | null;
  ref: string | null;
  coords: string | null;
}

export interface TripDocument {
  id: string;
  tripId: string;
  fileUrl: string;
  fileName: string;
  fileType: "PHOTO" | "DOCUMENT";
  uploadedBy: string;
  createdAt: string;
  signedUrl: string;
}

export interface Trip {
  id: string;
  title: string;
  status: TripStatus;
  truckId: string;
  driverId: string;
  managerId: string;
  companyId: string;
  notes: string | null;
  orderNumber: string | null;
  createdAt: string;
  updatedAt: string;
  chatResetAt: string | null;
  driver: { id: string; name: string | null; phone: string | null };
  manager: { id: string; name: string | null };
  truck: { id: string; plate: string };
  stops: TripStop[];
  documents: TripDocument[];
}

export interface TripMessageReplyPreview {
  id: string;
  content: string;
  deletedAt: string | null;
  sender: { id: string; name: string | null };
}

export interface TripDocReplyPreviewLite {
  id: string;
  fileName: string;
  fileType: "PHOTO" | "DOCUMENT";
  deletedAt: string | null;
  uploader: { id: string; name: string | null };
}

export interface TripMessage {
  id: string;
  tripId: string;
  senderId: string;
  content: string;
  translatedContent: string | null;
  isRead: boolean;
  isSystem?: boolean;
  createdAt: string;
  deletedAt?: string | null;
  editedAt?: string | null;
  replyToId?: string | null;
  replyTo?: TripMessageReplyPreview | null;
  replyToDocumentId?: string | null;
  replyToDocument?: TripDocReplyPreviewLite | null;
  sender: { id: string; name: string | null; role: string };
  // Session participants — used by the realtime layer to drop messages
  // belonging to a session the current user wasn't part of.
  session?: { driverId: string | null; managerId: string | null };
  reactions?: { id: string; userId: string; emoji: string }[];
}

export interface StopFormData {
  type: StopType;
  order?: number;
  address?: string;
  ref?: string;
  coords?: string;
}

export interface CreateTripData {
  title: string;
  driverId: string;
  truckId: string;
  notes?: string;
  orderNumber?: string;
  stops?: StopFormData[];
}

// all trips for the company
export function useTrips() {
  return useQuery<Trip[]>({
    queryKey: ["trips"],
    queryFn: async () => {
      const res = await api.get("/trips");
      return res.data;
    },
  });
}

// trips for a specific truck (Chat + Trips tabs in truck detail)
export function useTripsByTruck(truckId: string) {
  return useQuery<Trip[]>({
    queryKey: ["trips-by-truck", truckId],
    queryFn: async () => {
      const res = await api.get(`/trips/truck/${truckId}`);
      return res.data;
    },
    enabled: !!truckId,
  });
}

// message history for a trip (loaded once on mount, then WS takes over)
export function useTripMessages(tripId: string) {
  return useQuery<TripMessage[]>({
    queryKey: ["trip-messages", tripId],
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/messages`);
      return res.data;
    },
    enabled: !!tripId,
  });
}

export type SessionEndReason =
  | "DRIVER_CHANGED"
  | "MANAGER_CHANGED"
  | "TRIP_COMPLETED"
  | "LEGACY_RESET";

export interface ChatArchiveSession {
  id: string;
  tripId: string;
  driverId: string | null;
  managerId: string | null;
  startedAt: string;
  endedAt: string | null;
  endReason: SessionEndReason | null;
  driver: { id: string; name: string | null; role: string } | null;
  manager: { id: string; name: string | null; role: string } | null;
}

// Closed chat sessions for a trip — visible to managers (all) and to
// participants (only sessions they were part of).
export function useTripChatArchive(tripId: string) {
  return useQuery<ChatArchiveSession[]>({
    queryKey: ["trip-chat-archive", tripId],
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/chat/archive`);
      return res.data;
    },
    enabled: !!tripId,
  });
}

// Messages of a specific archived session — read-only.
export function useArchivedSessionMessages(tripId: string, sessionId: string | null) {
  return useQuery<TripMessage[]>({
    queryKey: ["trip-chat-archive-messages", tripId, sessionId],
    queryFn: async () => {
      const res = await api.get(
        `/trips/${tripId}/chat/sessions/${sessionId}/messages`,
      );
      return res.data;
    },
    enabled: !!tripId && !!sessionId,
  });
}

// Delete a single message. Server broadcasts `messageDeleted` so the cache
// patch is also taken care of in the gateway listener — but we invalidate
// here too for the rare case the socket missed the event.
export function useDeleteMessage(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/messages/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.setQueryData<TripMessage[]>(
        ["trip-messages", tripId],
        (old = []) => old.filter((m) => m.id !== id),
      );
    },
  });
}

export function useEditTripMessage(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await api.patch(`/messages/${id}`, { content });
      return res.data as TripMessage;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<TripMessage[]>(
        ["trip-messages", tripId],
        (old = []) => old.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
      );
    },
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTripData) => {
      const res = await api.post("/trips", data);
      return res.data as Trip;
    },
    onSuccess: (trip) => {
      queryClient.invalidateQueries({
        queryKey: ["trips-by-truck", trip.truckId],
      });
    },
  });
}

export function useUpdateTripStatus(truckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TripStatus }) => {
      const res = await api.patch(`/trips/${id}/status`, { status });
      return res.data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    },
  });
}

export interface UpdateStopData {
  type: StopType;
  order?: number;
  address?: string;
  ref?: string;
  coords?: string;
}

export function useBroadcastToMyTrucks() {
  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post("/trips/broadcast", { content });
      return res.data as { sent: number };
    },
  });
}

export function useReassignTrip(truckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, driverId }: { id: string; driverId: string }) => {
      const res = await api.patch(`/trips/${id}/assign`, { driverId });
      return res.data as Trip;
    },
    onSuccess: (updatedTrip) => {
      // Одразу патчимо кеш щоб не було race condition при ререндері.
      queryClient.setQueryData<Trip[]>(
        ["trips-by-truck", truckId],
        (old = []) =>
          old.map((t) => (t.id === updatedTrip.id ? updatedTrip : t)),
      );
      // Інвалідуємо повідомлення — бекенд поверне лише ті що після chatResetAt.
      queryClient.invalidateQueries({
        queryKey: ["trip-messages", updatedTrip.id],
      });
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    },
  });
}

export function useUpdateTripInfo(truckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      notes,
      orderNumber,
      stops,
    }: {
      id: string;
      notes?: string;
      orderNumber?: string;
      stops?: UpdateStopData[];
    }) => {
      const res = await api.patch(`/trips/${id}/info`, { notes, orderNumber, stops });
      return res.data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    },
  });
}
