"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";

interface PresenceState {
  onlineIds: Set<string>;
  /** Offline but seen within the last week → amber "away" instead of grey. */
  awayIds: Set<string>;
  setSnapshot: (ids: string[], awayIds: string[]) => void;
  setUserOnline: (id: string, online: boolean, away?: boolean) => void;
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
  awayIds: new Set<string>(),
  setSnapshot: (ids, awayIds) =>
    set({ onlineIds: new Set(ids), awayIds: new Set(awayIds) }),
  setUserOnline: (id, online, away = false) =>
    set((state) => {
      // Always allocate new Sets so React detects the change. Mutating
      // the existing one in place silently breaks downstream selectors.
      const nextOnline = new Set(state.onlineIds);
      const nextAway = new Set(state.awayIds);
      if (online) {
        nextOnline.add(id);
        nextAway.delete(id);
      } else {
        nextOnline.delete(id);
        if (away) nextAway.add(id);
        else nextAway.delete(id);
      }
      return { onlineIds: nextOnline, awayIds: nextAway };
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

    const onSnapshot = (data: { userIds: string[]; awayUserIds?: string[] }) => {
      setSnapshot(data.userIds, data.awayUserIds ?? []);
    };
    const onChange = (data: {
      userId: string;
      online: boolean;
      away?: boolean;
    }) => {
      setUserOnline(data.userId, data.online, data.away);
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

export type PresenceTier = "online" | "away" | "offline";

/** Live presence tier for a user — online / recently-away / offline. */
export function useUserPresence(
  userId: string | null | undefined,
): PresenceTier {
  return usePresenceStore((s) => {
    if (typeof userId !== "string") return "offline";
    if (s.onlineIds.has(userId)) return "online";
    if (s.awayIds.has(userId)) return "away";
    return "offline";
  });
}
