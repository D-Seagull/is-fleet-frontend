import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { StopType } from "@/hooks/use-trips";

/** One stop of the draft the server read from a transport order. */
export interface OrderDraftStop {
  type: StopType;
  name: string | null;
  address: string | null;
  ref: string | null;
  windowDate: string | null;
  windowStart: string | null;
  windowEnd: string | null;
  /** 1-based PDF page the stop was read from. */
  page: number | null;
  needsReview: boolean;
  reviewNote: string | null;
}

/** Freight / km / tolls — managers only, never in the driver's notes. */
export interface OrderFinance {
  freightRate: number | null;
  currency: string | null;
  loadedKm: number | null;
  emptyKm: number | null;
  tolls: number | null;
}

export interface TripFinanceData extends OrderFinance {
  updatedAt: string;
}

/** Draft for the new-trip form — nothing is saved until the trip is created. */
export interface OrderDraft {
  orderNumber: string | null;
  notes: string | null;
  stops: OrderDraftStop[];
  finance: OrderFinance;
  warnings: string[];
  isTransportOrder: boolean;
}

export interface TripOrderFile {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  url: string | null;
}

/** Is "fill from order" switched on on this server? Off → the button hides. */
export function useOrderImportStatus() {
  return useQuery({
    queryKey: ["order-import-status"],
    queryFn: async () => {
      const res = await api.get("/order-import/status");
      return res.data as { enabled: boolean };
    },
    staleTime: 10 * 60_000,
  });
}

/** File or pasted text → draft. A model reads it: allow it time. */
export function useParseOrder() {
  return useMutation({
    mutationFn: async (input: {
      file?: File;
      text?: string;
      locale: string;
      /** Driver picked in the form: the notes come back in their language. */
      driverId?: string;
    }) => {
      const form = new FormData();
      if (input.file) form.append("file", input.file);
      if (input.text) form.append("text", input.text);
      form.append("locale", input.locale);
      if (input.driverId) form.append("driverId", input.driverId);
      // `api` defaults to JSON: without this axios turns the FormData into
      // JSON and the file never arrives (same as every other upload here).
      const res = await api.post("/order-import/parse", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 180_000,
      });
      return res.data as OrderDraft;
    },
  });
}

export async function uploadTripOrder(tripId: string, file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post(`/trips/${tripId}/order`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data as TripOrderFile;
}

/** The trip's order file (managers only); null when the trip has none. */
export function useTripOrder(tripId: string | undefined) {
  return useQuery({
    queryKey: ["trip-order", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/order`);
      return (res.data || null) as TripOrderFile | null;
    },
  });
}

/** The trip's money side (managers only); null when nothing was entered. */
export function useTripFinance(tripId: string | undefined) {
  return useQuery({
    queryKey: ["trip-finance", tripId],
    enabled: !!tripId,
    queryFn: async () => {
      const res = await api.get(`/trips/${tripId}/finance`);
      return (res.data || null) as TripFinanceData | null;
    },
  });
}

export async function saveTripFinance(tripId: string, data: OrderFinance) {
  const res = await api.put(`/trips/${tripId}/finance`, data);
  return res.data as TripFinanceData;
}

export function useSaveTripFinance(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrderFinance) => saveTripFinance(tripId, data),
    onSuccess: (row) => queryClient.setQueryData(["trip-finance", tripId], row),
  });
}

export function useInvalidateTripOrder() {
  const queryClient = useQueryClient();
  return (tripId: string) =>
    queryClient.invalidateQueries({ queryKey: ["trip-order", tripId] });
}
