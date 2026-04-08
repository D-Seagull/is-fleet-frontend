import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Dispatcher {
  id: string;
  name: string | null;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

// Отримати всіх диспетчерів компанії
export function useDispatchers() {
  return useQuery<Dispatcher[]>({
    queryKey: ["dispatchers"],
    queryFn: async () => {
      const res = await api.get("/users");
      // фільтруємо тільки диспетчерів
      return res.data.filter((u: Dispatcher) => u.role === "DISPATCHER");
    },
  });
}

// Створити диспетчера
export function useCreateDispatcher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      const res = await api.post("/users/dispatcher", { email });
      return res.data;
    },
    onSuccess: () => {
      // оновлюємо список після створення
      queryClient.invalidateQueries({ queryKey: ["dispatchers"] });
    },
  });
}

// Деактивувати диспетчера
export function useDeactivateDispatcher() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/users/${id}/deactivate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatchers"] });
    },
  });
}
