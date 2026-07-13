import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { UserStatus } from "@/lib/status";

export type Role = "ADMIN" | "TEAMLEAD" | "MANAGER" | "DRIVER";

export interface AdminCompanyUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  role: Role;
  status: UserStatus;
  statusUntil: string | null;
  avatar: string | null;
  createdAt: string;
}

export interface AdminCompanyDetail {
  id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
  logo: string | null;
  accountingEmail: string | null;
  hrEmail: string | null;
  directorEmail: string | null;
  inviteToken: string | null;
  inviteExpiry: string | null;
  counts: {
    usersTotal: number;
    usersByRole: { ADMIN: number; TEAMLEAD: number; MANAGER: number; DRIVER: number };
    onlineNow: { drivers: number; managers: number };
    trucks: { total: number; active: number };
    trips: { active: number; thisMonth: number };
    pushCoverage: { withToken: number; outOf: number };
  };
  users: AdminCompanyUser[];
}

export function useAdminCompany(id: string | undefined) {
  return useQuery<AdminCompanyDetail>({
    queryKey: ["admin", "company", id],
    queryFn: async () => (await api.get(`/admin/companies/${id}`)).data,
    enabled: !!id,
    refetchInterval: 30_000,
  });
}

export function useDeactivateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await api.patch(`/admin/companies/${id}/deactivate`)).data,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ["admin", "company", id] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}

export function useResendCompanyInvite() {
  return useMutation({
    mutationFn: async ({ id, email }: { id: string; email: string }) =>
      (await api.post(`/admin/companies/${id}/resend-invite`, { email })).data,
  });
}
