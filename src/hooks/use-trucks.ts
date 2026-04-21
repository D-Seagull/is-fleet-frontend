import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TruckStatus = "AVAILABLE" | "ON_TRIP" | "REPAIR";

export interface Truck {
  id: string;
  plate: string;
  status: TruckStatus;
  companyId: string;
  currentDriverId: string | null;
  currentDriver: { id: string; name: string; phone: string } | null;
  dispatcherId: string | null;
  dispatcher: { id: string; name: string | null } | null;
  truckNotes: { content: string; createdAt: string }[];
}

export interface TruckNote {
  id: string;
  truckId: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; role: string };
}

export interface Driver {
  id: string;
  name: string | null;
  email: string;
  role: string;
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
      data: { plate?: string; status?: TruckStatus; currentDriverId?: string | null };
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
