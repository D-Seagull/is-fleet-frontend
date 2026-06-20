"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";

interface PresenceState {
  onlineIds: Set<string>;
  setSnapshot: (ids: string[]) => void;
  setUserOnline: (id: string, online: boolean) => void;
}

/**
 * Tiny live presence cache. Backend tells us who is online via two
 * channels:
 *   - `presenceSnapshot` on connect with the full set
 *   - `userPresenceChanged` thereafter, per teammate flip
 *
 * UI components read it through `useIsUserOnline(id)` to decide whether
 * to display the stored status or fall back to OFFLINE.
 */
const usePresenceStore = create<PresenceState>((set) => ({
  onlineIds: new Set<string>(),
  setSnapshot: (ids) => set({ onlineIds: new Set(ids) }),
  setUserOnline: (id, online) =>
    set((state) => {
      // Always allocate a new Set so React detects the change. Mutating
      // the existing one in place silently breaks downstream selectors.
      const next = new Set(state.onlineIds);
      if (online) next.add(id);
      else next.delete(id);
      return { onlineIds: next };
    }),
}));

export function usePresenceSync() {
  const setSnapshot = usePresenceStore((s) => s.setSnapshot);
  const setUserOnline = usePresenceStore((s) => s.setUserOnline);
  const myId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Self is always "online" the moment this hook mounts — we're
    // logged in. Seeding immediately stops the sidebar dot from
    // flashing OFFLINE-gray for a beat between login and the first
    // presence snapshot landing.
    if (myId) setUserOnline(myId, true);

    const onSnapshot = (data: { userIds: string[] }) => {
      setSnapshot(data.userIds);
    };
    const onChange = (data: { userId: string; online: boolean }) => {
      setUserOnline(data.userId, data.online);
    };

    socket.on("presenceSnapshot", onSnapshot);
    socket.on("userPresenceChanged", onChange);

    // Re-request snapshot. The backend already sent one on connect, but
    // the listener above may have been registered AFTER that emit landed
    // (especially right after login, when the socket connects in the
    // same tick the layout mounts). Asking again is cheap and the
    // backend simply replies with whatever sockets are in the room.
    const requestSnapshot = () => socket.emit("requestPresence");
    if (socket.connected) requestSnapshot();
    socket.on("connect", requestSnapshot);

    return () => {
      socket.off("presenceSnapshot", onSnapshot);
      socket.off("userPresenceChanged", onChange);
      socket.off("connect", requestSnapshot);
    };
  }, [setSnapshot, setUserOnline, myId]);
}

/** Reactive selector — re-renders the caller when this user flips. */
export function useIsUserOnline(
  userId: string | null | undefined,
): boolean {
  return usePresenceStore((s) =>
    typeof userId === "string" ? s.onlineIds.has(userId) : false,
  );
}
