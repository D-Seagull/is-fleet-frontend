import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";

export type BugStatus = "NEW" | "TRIAGED" | "RESOLVED";

export interface BugReportReporter {
  id: string;
  firstName: string;
  lastName: string | null;
  role: string;
  avatar: string | null;
}

export interface BugReport {
  id: string;
  reporterId: string;
  companyId: string | null;
  role: string;
  description: string;
  screenshots: string[];
  appName: string | null;
  appVersion: string | null;
  platform: string | null;
  route: string | null;
  socketState: string | null;
  status: BugStatus;
  createdAt: string;
  resolvedAt: string | null;
  reporter: BugReportReporter;
  company: { id: string; name: string } | null;
}

export const BUG_REPORTS_KEY = ["bug-reports"] as const;

/** All reports, or just those in one status. */
export function useBugReports(status?: BugStatus) {
  return useQuery<BugReport[]>({
    queryKey: [...BUG_REPORTS_KEY, status ?? "all"],
    queryFn: async () => {
      const res = await api.get("/bug-reports", {
        params: status ? { status } : undefined,
      });
      return res.data;
    },
    staleTime: 30_000,
    // Safety net: the socket sync below keeps this instant, but if the socket
    // ever misses an event the list still self-heals within the interval.
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

/** Count of NEW reports — drives the sidebar badge. */
export function useNewBugCount(): number {
  const { data } = useBugReports("NEW");
  return data?.length ?? 0;
}

export function useUpdateBugStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: BugStatus }) => {
      const res = await api.patch(`/bug-reports/${id}/status`, { status });
      return res.data as BugReport;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BUG_REPORTS_KEY });
    },
  });
}

/**
 * Global socket sync — refetch the reports whenever a new one lands, so the
 * admin inbox and the sidebar badge update in real time. Mount once (in the
 * admin layout) so it stays live across admin pages.
 */
export function useBugReportsSocketSync() {
  const queryClient = useQueryClient();
  // Depend on the token: login/refresh drops the socket (disconnectSocket) then
  // sets the token, so re-running once the token is present guarantees we
  // attach to a freshly AUTHENTICATED socket that actually joined the admin's
  // user room. Without this, a socket created before the token was ready stays
  // unauthenticated — no bug_report:new events, and DM sends get rejected.
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    const onNew = () => {
      void queryClient.invalidateQueries({ queryKey: BUG_REPORTS_KEY });
    };
    socket.on("bug_report:new", onNew);
    return () => {
      socket.off("bug_report:new", onNew);
    };
  }, [queryClient, token]);
}
