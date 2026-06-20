import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export type Language =
  | "UK"
  | "EN"
  | "PL"
  | "LT"
  | "UZ"
  | "KZ"
  | "HI"
  | "RU";

export interface UpdateMePayload {
  firstName?: string;
  lastName?: string | null;
  phone?: string;
  language?: Language;
  status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
  /** ISO-8601 timestamp at which BUSY/SLEEP should auto-clear. `null` =
   *  indefinite. Omit to leave the timer untouched. */
  statusUntil?: string | null;
}

/**
 * Self-update for the signed-in user — backend route: PATCH /users/me.
 * Returns the updated AuthUser, which we push into the store so the sidebar
 * + every cached list refreshes without a full /auth/me reload.
 */
export function useUpdateMe() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    // Update the store optimistically *before* the round-trip so the sidebar
    // dot flips colour the instant the user clicks. The server response then
    // confirms with the authoritative payload.
    mutationFn: async (payload: UpdateMePayload) => {
      const current = useAuthStore.getState().user;
      if (current && (payload.status !== undefined || payload.statusUntil !== undefined)) {
        setUser({
          ...current,
          ...(payload.status !== undefined ? { status: payload.status } : {}),
          ...(payload.statusUntil !== undefined
            ? { statusUntil: payload.statusUntil }
            : {}),
        });
      }
      const res = await api.patch("/users/me", payload);
      return res.data;
    },
    onSuccess: async () => {
      const me = await api.get("/auth/me");
      setUser(me.data);
      await queryClient.invalidateQueries({ queryKey: ["managers"] });
      await queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

/**
 * Upload the current user's avatar. Backend route: POST /users/avatar
 * (multipart form, field name "file"). Returns the updated User row.
 */
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post("/users/avatar", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data as { id: string; avatar: string | null };
    },
    onSuccess: async () => {
      // Pull the canonical /auth/me so the sidebar / pages get the URL.
      const me = await api.get("/auth/me");
      setUser(me.data);
      await queryClient.invalidateQueries({ queryKey: ["managers"] });
      await queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}

export function useDeleteAvatar() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete("/users/avatar");
      return res.data;
    },
    onSuccess: async () => {
      const me = await api.get("/auth/me");
      setUser(me.data);
      await queryClient.invalidateQueries({ queryKey: ["managers"] });
      await queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
  });
}
