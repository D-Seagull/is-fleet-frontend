import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { UNREAD_QUERY_KEY } from "@/hooks/use-unread";

export type TruckStatus = "AVAILABLE" | "ON_TRIP" | "REPAIR";

export interface Truck {
  id: string;
  plate: string;
  status: TruckStatus;
  companyId: string;
  currentDriverId: string | null;
  currentDriver: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string;
    avatar?: string | null;
    status?: "ONLINE" | "BUSY" | "SLEEP";
    statusUntil?: string | null;
  } | null;
  managerId: string | null;
  manager: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
    status?: "ONLINE" | "BUSY" | "SLEEP";
    statusUntil?: string | null;
  } | null;
  truckNotes: { content: string; createdAt: string }[];
}

export interface TruckNote {
  id: string;
  truckId: string;
  content: string;
  createdAt: string;
  user: { id: string; firstName: string;
    lastName: string | null; avatar: string | null;
    status?: "ONLINE" | "BUSY" | "SLEEP";
    statusUntil?: string | null; role: string };
}

export interface Driver {
  id: string;
  firstName: string;
    lastName: string | null;
    avatar: string | null;
    status?: "ONLINE" | "BUSY" | "SLEEP";
    statusUntil?: string | null;
  email: string;
  role: string;
  currentTruck: { id: string; plate: string } | null;
}

export function useTrucks() {
  return useQuery<Truck[]>({
    queryKey: ["trucks"],
    queryFn: async () => {
      const res = await api.get("/trucks");
      return res.data;
    },
  });
}

export function useTruck(id: string) {
  return useQuery<Truck>({
    queryKey: ["trucks", id],
    queryFn: async () => {
      const res = await api.get(`/trucks/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { plate: string; currentDriverId?: string }) => {
      const res = await api.post("/trucks", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
    },
  });
}

export function useUpdateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: { plate?: string; status?: TruckStatus; currentDriverId?: string | null; managerId?: string | null };
    }) => {
      const res = await api.patch(`/trucks/${id}`, data);
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      queryClient.invalidateQueries({ queryKey: ["trucks", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["trucks-my"] });
    },
  });
}

/**
 * Listen for `truckChanged` socket events emitted when a manager reassigns
 * a driver between trucks (or detaches/attaches one). Invalidates every cache
 * touched by that change so all managers — including the one who didn't
 * trigger the action — see the move immediately.
 */
export function useTruckChangedSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();
    const onTruckChanged = () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      queryClient.invalidateQueries({ queryKey: ["trucks-my"] });
      queryClient.invalidateQueries({ queryKey: ["trucks-deactivated"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["drivers-deactivated"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck"] });
      queryClient.invalidateQueries({ queryKey: UNREAD_QUERY_KEY });
    };
    socket.on("truckChanged", onTruckChanged);
    return () => {
      socket.off("truckChanged", onTruckChanged);
    };
  }, [queryClient]);
}

export function useDeleteTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/trucks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      queryClient.invalidateQueries({ queryKey: ["trucks-deactivated"] });
    },
  });
}

export function useTruckNotes(truckId: string) {
  return useQuery<TruckNote[]>({
    queryKey: ["truck-notes", truckId],
    queryFn: async () => {
      const res = await api.get(`/trucks/${truckId}/notes`);
      return res.data;
    },
    enabled: !!truckId,
  });
}

export function useCreateTruckNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      truckId,
      content,
    }: {
      truckId: string;
      content: string;
    }) => {
      const res = await api.post(`/trucks/${truckId}/notes`, { content });
      return res.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["truck-notes", variables.truckId],
      });
    },
  });
}

export function useDeleteTruckNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      noteId,
      truckId,
    }: {
      noteId: string;
      truckId: string;
    }) => {
      await api.delete(`/trucks/notes/${noteId}`);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["truck-notes", variables.truckId],
      });
    },
  });
}

export function useMyTrucks() {
  return useQuery<Truck[]>({
    queryKey: ["trucks-my"],
    queryFn: async () => {
      const res = await api.get("/trucks/my");
      return res.data;
    },
  });
}

export function useDeactivatedTrucks() {
  return useQuery<Truck[]>({
    queryKey: ["trucks-deactivated"],
    queryFn: async () => {
      const res = await api.get("/trucks/deactivated");
      return res.data;
    },
  });
}

export function useActivateTruck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/trucks/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
      queryClient.invalidateQueries({ queryKey: ["trucks-deactivated"] });
    },
  });
}

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await api.get("/users");
      return (res.data as Driver[]).filter((u) => u.role === "DRIVER");
    },
  });
}
