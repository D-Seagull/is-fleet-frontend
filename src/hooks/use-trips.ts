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
  uploadedBy: string;
  createdAt: string;
}

export interface Trip {
  id: string;
  title: string;
  status: TripStatus;
  truckId: string;
  driverId: string;
  dispatcherId: string;
  companyId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  driver: { id: string; name: string | null; phone: string | null };
  dispatcher: { id: string; name: string | null };
  stops: TripStop[];
  documents: TripDocument[];
}

export interface TripMessage {
  id: string;
  tripId: string;
  senderId: string;
  content: string;
  translatedContent: string | null;
  createdAt: string;
  sender: { id: string; name: string | null; role: string };
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
  stops?: StopFormData[];
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

export function useUpdateTripInfo(truckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      notes,
      stops,
    }: {
      id: string;
      notes?: string;
      stops?: UpdateStopData[];
    }) => {
      const res = await api.patch(`/trips/${id}/info`, { notes, stops });
      return res.data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    },
  });
}
