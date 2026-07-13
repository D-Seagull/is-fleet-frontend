import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Company {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isActive?: boolean;
  _count?: { users: number };
}

export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => (await api.get("/admin/companies")).data,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; email: string }) =>
      (await api.post("/admin/companies", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
  });
}
