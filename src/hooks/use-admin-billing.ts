import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type BillingStatus =
  | "TRIAL"
  | "PILOT"
  | "PAYING"
  | "OVERDUE"
  | "DEACTIVATED";

export const BILLING_STATUSES: BillingStatus[] = [
  "TRIAL",
  "PILOT",
  "PAYING",
  "OVERDUE",
  "DEACTIVATED",
];

export interface BillingCompany {
  id: string;
  name: string;
  createdAt: string;
  isActive: boolean;
  billingStatus: BillingStatus;
  pricePerTruck: number | null;
  currency: string;
  pilotEndsAt: string | null;
  adminNote: string | null;
  /** Trucks with at least one trip in the month. */
  paidTrucks: number;
  drivers: number;
  managers: number;
  amount: number | null;
  /** Newest sign-in / app use / new trip; null = nothing yet. */
  lastActivityAt: string | null;
}

export interface CompanyUsage {
  days: number;
  trips: number;
  statusTrips: number;
  driverStatusTrips: number;
  driverStatusShare: number | null;
  documents: number;
  drivers: {
    total: number;
    activeLast7d: number;
    neverSignedIn: {
      id: string;
      firstName: string;
      lastName: string | null;
      phone: string | null;
    }[];
  };
  lastActivityAt: string | null;
}

/** A week without any activity = the customer is drifting away. */
export const SILENT_DAYS = 7;

export function useCompanyUsage(companyId: string, days = 30) {
  return useQuery<CompanyUsage>({
    queryKey: ["admin", "usage", companyId, days],
    queryFn: async () =>
      (
        await api.get(`/admin/companies/${companyId}/usage`, {
          params: { days },
        })
      ).data,
  });
}

export interface BillingResponse {
  month: string;
  companies: BillingCompany[];
}

export interface BillingUpdate {
  billingStatus?: BillingStatus;
  pricePerTruck?: number | null;
  currency?: string;
  pilotEndsAt?: string | null;
  adminNote?: string | null;
}

/** "YYYY-MM" of today (local). */
export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function useBilling(month: string) {
  return useQuery<BillingResponse>({
    queryKey: ["admin", "billing", month],
    queryFn: async () =>
      (await api.get("/admin/billing", { params: { month } })).data,
  });
}

export function useUpdateBilling(companyId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: BillingUpdate) =>
      (await api.patch(`/admin/companies/${companyId}/billing`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "billing"] });
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["admin", "company", companyId] });
    },
  });
}
