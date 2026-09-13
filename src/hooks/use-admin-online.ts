import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";
import type { UserStatus } from "@/lib/status";

export interface OnlineUser {
  id: string;
  firstName: string;
  lastName: string | null;
  role: string;
  avatar: string | null;
  status: UserStatus;
  company: { id: string; name: string } | null;
}

export const ONLINE_USERS_KEY = ["admin", "online-users"] as const;

/** Users with a live socket right now (cross-company). */
export function useOnlineUsers() {
  return useQuery<OnlineUser[]>({
    queryKey: ONLINE_USERS_KEY,
    queryFn: async () => (await api.get("/admin/online-users")).data,
    // Socket sync keeps this instant; the interval is a self-heal safety net.
    refetchInterval: 30_000,
  });
}

/**
 * Refetch the online list whenever the gateway reports a cross-company presence
 * change (`adminPresenceChanged`, emitted to the `admins` room). Mount once in
 * the admin layout so the dashboard list stays live across pages.
 */
export function useOnlineUsersSocketSync() {
  const qc = useQueryClient();
  const token = useAuthStore((s) => s.token);
  useEffect(() => {
    if (!token) return;
    const socket = getSocket();
    const onChange = () => {
      void qc.invalidateQueries({ queryKey: ONLINE_USERS_KEY });
      // Keep the dashboard's "Online" KPI (from /admin/stats) live too.
      void qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    };
    socket.on("adminPresenceChanged", onChange);
    return () => {
      socket.off("adminPresenceChanged", onChange);
    };
  }, [qc, token]);
}
