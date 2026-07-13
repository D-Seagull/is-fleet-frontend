import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface AdminStats {
  companies: { total: number; active: number; deactivated: number };
  users: {
    total: number;
    byRole: { ADMIN: number; TEAMLEAD: number; MANAGER: number; DRIVER: number };
  };
  onlineNow: { drivers: number; managers: number };
  activeTrips: number;
  recentCompanies: {
    id: string;
    name: string;
    createdAt: string;
    isActive: boolean;
    usersCount: number;
    awaitingInvite: boolean;
  }[];
}

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: async () => (await api.get("/admin/stats")).data,
    refetchInterval: 30_000,
  });
}
