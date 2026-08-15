"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getSocket } from "@/lib/socket";
import { useAuthStore } from "@/store/auth";

type Status = "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";

interface UserStatusEvent {
  userId: string;
  status: Status;
  statusUntil: string | null;
}

/**
 * Listens for `userStatusChanged` broadcasts (sent by backend updateMe
 * to `company-{companyId}`) and patches every cached payload that
 * surfaces a presence dot — DM conversations, manager / driver lists,
 * group messages, trip messages, plus my own auth store if it was me.
 *
 * Patching in place is way cheaper than refetching the affected lists,
 * and keeps the sidebar / chat headers in sync the moment a teammate
 * flips their dot.
 */
export function useUserStatusSync() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const myId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onChange = (evt: UserStatusEvent) => {
      // 1) Self: hydrate my auth store so the sidebar reacts even if I
      //    flipped my own status from another tab.
      if (evt.userId === myId) {
        const current = useAuthStore.getState().user;
        if (current) {
          setUser({
            ...current,
            status: evt.status,
            statusUntil: evt.statusUntil,
          });
        }
      }

      const patchUser = <T extends { id: string; status?: Status | null; statusUntil?: string | null }>(u: T): T => {
        if (u.id !== evt.userId) return u;
        return { ...u, status: evt.status, statusUntil: evt.statusUntil };
      };

      // 2) DM conversations — patch each conv.user that matches.
      queryClient.setQueriesData<unknown>(
        { queryKey: ["conversations"] },
        (data: unknown) => {
          if (!Array.isArray(data)) return data;
          let changed = false;
          const next = data.map((conv: { user: { id: string } }) => {
            if (conv.user.id !== evt.userId) return conv;
            changed = true;
            return { ...conv, user: patchUser(conv.user as never) };
          });
          return changed ? next : data;
        },
      );

      // 3) Plain user lists (/users, drivers, managers, teamleads,
      //    assignable-managers, team-members).
      const userListKeys = [
        ["drivers"],
        ["drivers-deactivated"],
        ["managers"],
        ["assignable-managers"],
        ["team-members"],
        ["teamleads"],
      ];
      for (const key of userListKeys) {
        queryClient.setQueriesData<unknown>({ queryKey: key }, (data: unknown) => {
          if (!Array.isArray(data)) return data;
          let changed = false;
          const next = data.map((u: { id: string }) => {
            if (u.id !== evt.userId) return u;
            changed = true;
            return patchUser(u as never);
          });
          return changed ? next : data;
        });
      }

      // 4) Single-user details (/users/:id surfaces).
      queryClient.setQueriesData<unknown>(
        { queryKey: ["managers", evt.userId] },
        (data: unknown) => (data ? patchUser(data as never) : data),
      );
      queryClient.setQueriesData<unknown>(
        { queryKey: ["drivers", evt.userId] },
        (data: unknown) => (data ? patchUser(data as never) : data),
      );

      // 5) Group definitions — patch sender entries inside managers[].
      queryClient.setQueriesData<unknown>(
        { queryKey: ["manager-groups"] },
        (data: unknown) => {
          if (!Array.isArray(data)) return data;
          let changed = false;
          const next = data.map(
            (g: {
              managers: { manager: { id: string } }[];
            }) => {
              if (!g.managers.some((m) => m.manager.id === evt.userId)) return g;
              changed = true;
              return {
                ...g,
                managers: g.managers.map((m) =>
                  m.manager.id === evt.userId
                    ? { ...m, manager: patchUser(m.manager as never) }
                    : m,
                ),
              };
            },
          );
          return changed ? next : data;
        },
      );

      // 6) Group chat history — patch the sender on each message that
      //    came from this user.
      queryClient.setQueriesData<unknown>(
        { queryKey: ["group-messages"] },
        (data: unknown) => {
          if (!Array.isArray(data)) return data;
          let changed = false;
          const next = data.map((msg: { sender?: { id: string } }) => {
            if (!msg.sender || msg.sender.id !== evt.userId) return msg;
            changed = true;
            return { ...msg, sender: patchUser(msg.sender as never) };
          });
          return changed ? next : data;
        },
      );

      // 7) Trip chat history — same shape as group messages.
      queryClient.setQueriesData<unknown>(
        { queryKey: ["trip-messages"] },
        (data: unknown) => {
          if (!Array.isArray(data)) return data;
          let changed = false;
          const next = data.map((msg: { sender?: { id: string } }) => {
            if (!msg.sender || msg.sender.id !== evt.userId) return msg;
            changed = true;
            return { ...msg, sender: patchUser(msg.sender as never) };
          });
          return changed ? next : data;
        },
      );

      // 8) DM message history — patch sender on each direct message.
      queryClient.setQueriesData<unknown>(
        { queryKey: ["direct-messages"] },
        (data: unknown) => {
          if (!Array.isArray(data)) return data;
          let changed = false;
          const next = data.map((msg: { sender?: { id: string } }) => {
            if (!msg.sender || msg.sender.id !== evt.userId) return msg;
            changed = true;
            return { ...msg, sender: patchUser(msg.sender as never) };
          });
          return changed ? next : data;
        },
      );

      // 9) Trucks list — currentDriver / manager may be this user.
      queryClient.setQueriesData<unknown>(
        { queryKey: ["trucks"] },
        (data: unknown) => {
          if (!Array.isArray(data)) return data;
          let changed = false;
          const next = data.map(
            (t: {
              currentDriver?: { id: string } | null;
              manager?: { id: string } | null;
            }) => {
              let updated = t;
              if (t.currentDriver?.id === evt.userId) {
                updated = { ...updated, currentDriver: patchUser(t.currentDriver as never) };
                changed = true;
              }
              if (t.manager?.id === evt.userId) {
                updated = { ...updated, manager: patchUser(t.manager as never) };
                changed = true;
              }
              return updated;
            },
          );
          return changed ? next : data;
        },
      );

      // 10) Truck detail panel (`["trucks", id]`) — same shape.
      queryClient.setQueriesData<unknown>(
        { queryKey: ["trucks"], type: "all" },
        // setQueriesData filters by key prefix already; this is per-truck
        // entry. Skip arrays (handled above) and patch object shapes.
        (data: unknown) => {
          if (!data || Array.isArray(data)) return data;
          const t = data as {
            currentDriver?: { id: string } | null;
            manager?: { id: string } | null;
          };
          let updated = t;
          let changed = false;
          if (t.currentDriver?.id === evt.userId) {
            updated = { ...updated, currentDriver: patchUser(t.currentDriver as never) };
            changed = true;
          }
          if (t.manager?.id === evt.userId) {
            updated = { ...updated, manager: patchUser(t.manager as never) };
            changed = true;
          }
          return changed ? updated : data;
        },
      );

      // 11) Trips lists — every `["trips"]`, `["trips-by-truck", _]`,
      //     `["my-trips"]`, plus single-trip details. driver and manager
      //     embed status fields.
      const patchTripArray = (data: unknown) => {
        if (!Array.isArray(data)) return data;
        let changed = false;
        const next = data.map(
          (trip: {
            driver?: { id: string } | null;
            manager?: { id: string } | null;
          }) => {
            let updated = trip;
            if (trip.driver?.id === evt.userId) {
              updated = { ...updated, driver: patchUser(trip.driver as never) };
              changed = true;
            }
            if (trip.manager?.id === evt.userId) {
              updated = { ...updated, manager: patchUser(trip.manager as never) };
              changed = true;
            }
            return updated;
          },
        );
        return changed ? next : data;
      };
      queryClient.setQueriesData<unknown>(
        { queryKey: ["trips"] },
        patchTripArray,
      );
      queryClient.setQueriesData<unknown>(
        { queryKey: ["trips-by-truck"] },
        patchTripArray,
      );
      queryClient.setQueriesData<unknown>(
        { queryKey: ["my-trips"] },
        patchTripArray,
      );
    };

    socket.on("userStatusChanged", onChange);
    return () => {
      socket.off("userStatusChanged", onChange);
    };
  }, [queryClient, setUser, myId]);
}
