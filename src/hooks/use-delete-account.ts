import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

/**
 * Irreversible self-service account erasure — backend route: DELETE /users/me.
 *
 * The server anonymises the row rather than dropping it (trips and messages
 * are company records that have to survive), scrubs every personal field and
 * revokes all tokens. The access token dies with the request, so there is
 * nothing useful left to do with the session afterwards: the caller should
 * send the user to /login immediately.
 *
 * No cache invalidation on success — `logout()` clears the store and every
 * query alongside it, so refetching here would only fire doomed 401s.
 */
export function useDeleteAccount() {
  const logout = useAuthStore((s) => s.logout);
  return useMutation({
    mutationFn: async () => {
      await api.delete("/users/me");
    },
    onSuccess: () => {
      logout();
    },
  });
}
