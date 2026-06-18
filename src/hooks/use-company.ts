import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Company {
  id: string;
  name: string;
  logo: string | null;
  accountingEmail: string | null;
  hrEmail: string | null;
  directorEmail: string | null;
  createdAt: string;
  isActive: boolean;
}

export interface UpdateCompanyPayload {
  name?: string;
  accountingEmail?: string | null;
  hrEmail?: string | null;
  directorEmail?: string | null;
}

/**
 * Loads the signed-in user's company. Backend: GET /companies.
 * MANAGER and DRIVER can read this — they just don't get the edit UI.
 */
export function useCompany() {
  return useQuery<Company>({
    queryKey: ["company", "me"],
    queryFn: async () => {
      const res = await api.get("/companies");
      return res.data;
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpdateCompanyPayload) => {
      const res = await api.patch("/companies", payload);
      return res.data as Company;
    },
    onSuccess: (company) => {
      queryClient.setQueryData(["company", "me"], company);
    },
  });
}
