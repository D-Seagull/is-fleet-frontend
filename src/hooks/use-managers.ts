import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Manager {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  teamlead?: { id: string; name: string | null } | null;
  manager?: { id: string; name: string | null } | null;
  managerAverageRating?: number | null;
  managerRatingCount?: number;
}

export interface ManagerRating {
  id: string;
  score: number;
  comment: string | null;
  anonymous: boolean;
  createdAt: string;
  ratedBy: { id: string; name: string | null; role: string };
}

// Усі менеджери компанії
export function useManagers() {
  return useQuery<Manager[]>({
    queryKey: ["managers"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data.filter((u: Manager) => u.role === "MANAGER");
    },
  });
}

// Створити менеджера
export function useCreateManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      email: string;
      phone: string;
      name?: string;
    }) => {
      const res = await api.post("/users/manager", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
}

// Можуть бути призначені менеджерами (MANAGER + TEAMLEAD)
export function useAssignableManagers() {
  return useQuery<Manager[]>({
    queryKey: ["assignable-managers"],
    queryFn: async () => {
      const res = await api.get("/users");
      return (res.data as Manager[]).filter(
        (u) => u.role === "MANAGER" || u.role === "TEAMLEAD",
      );
    },
  });
}

// Деактивувати менеджера
export function useDeactivateManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/${id}/deactivate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
}

// Активувати
export function useActivateManager() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/${id}/activate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
}

// Рейтинги конкретного менеджера
export function useManagerRatings(managerId: string | null | undefined) {
  return useQuery<{
    ratings: ManagerRating[];
    averageRating: number | null;
    ratingCount: number;
  }>({
    queryKey: ["manager-ratings", managerId],
    enabled: !!managerId,
    queryFn: async () => {
      const res = await api.get(`/users/${managerId}/manager-ratings`);
      return res.data;
    },
  });
}

// Залишити оцінку менеджеру (DRIVER-only ендпоїнт)
export function useRateManager(managerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      score: number;
      comment?: string;
      anonymous?: boolean;
    }) => {
      const res = await api.post(
        `/users/${managerId}/manager-ratings`,
        payload,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-ratings", managerId] });
      queryClient.invalidateQueries({ queryKey: ["managers"] });
    },
  });
}
