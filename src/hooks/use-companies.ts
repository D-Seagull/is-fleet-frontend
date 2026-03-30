import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface Company {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function useCompanies() {
  return useQuery<Company[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const res = await api.get("/admin/companies");
      console.log(res.data);
      return res.data;
    },
  });
}
