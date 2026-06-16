import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Re-export the generic user-update hook from drivers — same endpoint
// (PATCH /users/:id), same payload shape (name/phone/language/managerId/
// teamleadId/truckId). Re-exporting keeps manager pages from importing
// driver-flavoured names.
export { useUpdateDriver as useUpdateUser } from "./use-drivers";

export interface Manager {
  id: string;
  firstName: string;
    lastName: string | null;
  email: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  teamleadId: string | null;
  managerId: string | null;
  teamlead?: {
    id: string;
    firstName: string;
    lastName: string | null;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
  } | null;
  manager?: {
    id: string;
    firstName: string;
    lastName: string | null;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
  } | null;
  managerAverageRating?: number | null;
  managerRatingCount?: number;
  truckCount?: number;
}

export interface ManagerRating {
  id: string;
  score: number;
  comment: string | null;
  anonymous: boolean;
  createdAt: string;
  ratedBy: { id: string; firstName: string;
    lastName: string | null; role: string };
}

export interface ManagerDetail extends Manager {
  language: string;
  companyId: string;
  assignedTrucks?: {
    id: string;
    plate: string;
    status: string;
    currentDriver: { id: string; firstName: string; lastName: string | null } | null;
  }[];
  drivers?: {
    id: string;
    firstName: string;
    lastName: string | null;
    phone: string | null;
    avatar: string | null;
    currentTruck: { id: string; plate: string } | null;
  }[];
  managerRatingsReceived?: ManagerRating[];
}

// Одного менеджера (або взагалі будь-якого юзера) по id — backend повертає
// все потрібне; ми просто звужуємо тип під сторінку менеджера.
export function useManager(id: string | null | undefined) {
  return useQuery<ManagerDetail>({
    queryKey: ["managers", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await api.get(`/users/${id}`);
      return res.data;
    },
  });
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

/**
 * Team-level users (MANAGER + TEAMLEAD + ADMIN) — used for things like the
 * "create group" picker where the current user may need to add their team
 * lead and other managers (not just other MANAGERs).
 */
export function useTeamMembers() {
  return useQuery<Manager[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const res = await api.get("/users");
      return res.data.filter(
        (u: Manager) =>
          u.role === "MANAGER" ||
          u.role === "TEAMLEAD" ||
          u.role === "ADMIN",
      );
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
      firstName?: string;
      lastName?: string | null;
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

// Доступні тімліди для призначення менеджеру
export function useTeamleads() {
  return useQuery<Manager[]>({
    queryKey: ["teamleads"],
    queryFn: async () => {
      const res = await api.get("/users");
      return (res.data as Manager[]).filter((u) => u.role === "TEAMLEAD");
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
