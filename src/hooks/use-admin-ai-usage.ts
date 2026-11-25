import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/** One company's AI month: requests, AI trips, tokens and money (USD). */
export interface AiUsageRow {
  companyId: string;
  name: string;
  aiEnabled: boolean;
  /** USD per trip created from an order with AI; null = not priced. */
  aiPricePerTrip: number | null;
  requests: number;
  /** Requests that gave no usable draft (refused, not an order, error). */
  failed: number;
  /** Trips created from an order with AI this month. */
  aiTrips: number;
  inputTokens: number;
  outputTokens: number;
  /** What the requests cost us. */
  costUsd: number;
  /** What the company owes: AI trips × price; null when not priced. */
  revenueUsd: number | null;
  marginUsd: number | null;
}

export interface AiUsageResponse {
  month: string;
  currency: "USD";
  totals: Omit<
    AiUsageRow,
    | "companyId"
    | "name"
    | "aiEnabled"
    | "aiPricePerTrip"
    | "revenueUsd"
    | "marginUsd"
  > & { revenueUsd: number; marginUsd: number };
  companies: AiUsageRow[];
}

/** Admin only: the AI report of one month ("YYYY-MM"). */
export function useAiUsage(month: string) {
  return useQuery<AiUsageResponse>({
    queryKey: ["admin", "ai-usage", month],
    queryFn: async () =>
      (await api.get("/admin/ai-usage", { params: { month } })).data,
  });
}

export const usd = (n: number, locale: string) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n !== 0 && Math.abs(n) < 1 ? 4 : 2,
  }).format(n);
