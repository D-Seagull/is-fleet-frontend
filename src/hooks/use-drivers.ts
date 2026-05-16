import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Language = "UK" | "EN" | "PL" | "LT" | "UZ" | "KZ" | "HI" | "RU";

export interface Driver {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  language: Language;
  isActive: boolean;
  createdAt: string;
  manager: { id: string; name: string | null } | null;
  currentTruck: { id: string; plate: string; status: string } | null;
  ratingCount: number;
  averageRating: number | null;
}

export interface DriverRating {
  id: string;
  score: number;
  comment: string | null;
  anonymous: boolean;
  createdAt: string;
  ratedBy: { id: string; name: string | null; role: string };
}

export interface DriverDetail {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatar: string | null;
  role: string;
  language: Language;
  isActive: boolean;
  createdAt: string;
  manager: { id: string; name: string | null; email: string | null } | null;
  currentTruck: { id: string; plate: string; status: string } | null;
  ratingsReceived: DriverRating[];
  averageRating: number | null;
  ratingCount: number;
}

export interface CreateDriverPayload {
  name: string;
  phone: string;
  language?: Language;
}

export function useDrivers() {
  return useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: async () => {
      const res = await api.get("/users");
      return (res.data as Driver[]).filter(
        (u) => u.role === "DRIVER" && u.isActive,
      );
    },
  });
}

export function useDeactivatedDrivers() {
  return useQuery<Driver[]>({
    queryKey: ["drivers-deactivated"],
    queryFn: async () => {
      const res = await api.get("/users");
      return (res.data as Driver[]).filter(
        (u) => u.role === "DRIVER" && !u.isActive,
      );
    },
  });
}

export function useDriver(id: string) {
  return useQuery<DriverDetail>({
    queryKey: ["drivers", id],
    queryFn: async () => {
      const res = await api.get(`/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateDriverPayload) => {
      const res = await api.post("/users/driver", data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

export function useDeactivateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/${id}/deactivate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["drivers-deactivated"] });
    },
  });
}

export function useActivateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["drivers-deactivated"] });
    },
  });
}

export function useDriverRatings(driverId: string) {
  return useQuery<{ ratings: DriverRating[]; averageRating: number | null; ratingCount: number }>({
    queryKey: ["driver-ratings", driverId],
    queryFn: async () => {
      const res = await api.get(`/users/${driverId}/ratings`);
      return res.data;
    },
    enabled: !!driverId,
  });
}

export function useUpdateDriver(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { phone?: string; managerId?: string | null; truckId?: string | null }) => {
      const res = await api.patch(`/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers", id] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["trucks"] });
    },
  });
}

export function useCompanyManagers() {
  return useQuery<{ id: string; name: string | null }[]>({
    queryKey: ["managers"],
    queryFn: async () => {
      const res = await api.get("/users");
      return (res.data as { id: string; name: string | null; role: string }[]).filter(
        (u) => u.role === "MANAGER" || u.role === "TEAMLEAD",
      );
    },
  });
}

export function useUpsertDriverRating(driverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { score: number; comment?: string; anonymous?: boolean }) => {
      const res = await api.post(`/users/${driverId}/ratings`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver-ratings", driverId] });
      queryClient.invalidateQueries({ queryKey: ["drivers", driverId] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}
