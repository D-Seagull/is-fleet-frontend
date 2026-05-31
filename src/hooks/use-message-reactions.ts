import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

export type ReactionTargetType =
  | "DM"
  | "GROUP"
  | "TRIP"
  | "DM_DOC"
  | "GROUP_DOC"
  | "TRIP_DOC";

export interface MessageReactionRow {
  id: string;
  userId: string;
  emoji: string;
}

export const QUICK_REACTION_EMOJIS = ["👍", "😮", "😢"] as const;
export type QuickReactionEmoji = (typeof QUICK_REACTION_EMOJIS)[number];

const REACT_ENDPOINT: Record<ReactionTargetType, string> = {
  DM: "/direct-messages/messages",
  GROUP: "/group-messages/messages",
  TRIP: "/messages",
  DM_DOC: "/direct-messages/documents",
  GROUP_DOC: "/group-messages/documents",
  TRIP_DOC: "/documents",
};

export function useToggleReaction(type: ReactionTargetType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      const t0 = Date.now();
      const res = await api.post(
        `${REACT_ENDPOINT[type]}/${messageId}/react`,
        { emoji },
      );
      const dt = Date.now() - t0;
      // eslint-disable-next-line no-console
      console.log(
        `[reactions web] toggle ${type} ${messageId} POST round-trip=${dt}ms`,
      );
      return res.data as MessageReactionRow[];
    },
    // Optimistic patch — bubble flips IMMEDIATELY without waiting for the
    // ~400-800ms POST round-trip (Supabase pgbouncer + EU-west-1 latency).
    // The WS `reaction_changed` echo arrives ~500ms later and reconciles
    // the cache to the authoritative server state.
    //
    // We intentionally do NOT invalidateQueries on success — that would
    // trigger a full refetch of every open chat (+1s wasted). The WS
    // event already keeps everyone in sync.
    onMutate: ({ messageId, emoji }) => {
      const patch = <
        T extends { id: string; reactions?: MessageReactionRow[] },
      >(
        prev: T[] = [],
      ) =>
        prev.map((row) => {
          if (row.id !== messageId) return row;
          const reactions = [...(row.reactions ?? [])];
          // Same-emoji entry assumed to be mine → toggle off. Otherwise
          // append an optimistic row. Drift gets corrected by the WS echo.
          const myIdx = reactions.findIndex((r) => r.emoji === emoji);
          if (myIdx >= 0) {
            reactions.splice(myIdx, 1);
          } else {
            reactions.push({
              id: `optimistic-${Date.now()}`,
              userId: "me",
              emoji,
            });
          }
          return { ...row, reactions };
        });

      const caches: string[] = (() => {
        switch (type) {
          case "DM":
            return ["messages"];
          case "GROUP":
            return ["group-messages"];
          case "TRIP":
            return ["trip-messages"];
          case "DM_DOC":
            return ["conversation-documents"];
          case "GROUP_DOC":
            return ["group-documents"];
          case "TRIP_DOC":
            return ["documents-trip"];
        }
      })();
      caches.forEach((key) => {
        queryClient
          .getQueryCache()
          .findAll({ predicate: (q) => q.queryKey[0] === key })
          .forEach((q) => queryClient.setQueryData(q.queryKey, patch));
      });
    },
  });
}

/**
 * Global socket listener — when a reaction changes anywhere, update the
 * relevant message cache so any open chat view re-renders the new state.
 */
export function useReactionsSocketSync(opts?: {
  dmOtherUserId?: string | null;
  groupId?: string | null;
  tripId?: string | null;
}) {
  const queryClient = useQueryClient();
  const dmOther = opts?.dmOtherUserId ?? null;
  const groupId = opts?.groupId ?? null;
  const tripId = opts?.tripId ?? null;

  useEffect(() => {
    const socket = getSocket();
    const onChange = (payload: {
      targetType: ReactionTargetType;
      targetId: string;
      reactions: MessageReactionRow[];
    }) => {
      const { targetType, targetId, reactions } = payload;
      const update = <T extends { id: string; reactions?: MessageReactionRow[] }>(
        prev: T[] = [],
      ) =>
        prev.map((m) =>
          m.id === targetId ? ({ ...m, reactions } as T) : m,
        );

      if (targetType === "DM" && dmOther) {
        queryClient.setQueryData(["messages", dmOther], update);
      } else if (targetType === "GROUP" && groupId) {
        queryClient.setQueryData(["group-messages", groupId], update);
      } else if (targetType === "TRIP" && tripId) {
        queryClient.setQueryData(["trip-messages", tripId], update);
      } else if (targetType === "DM_DOC" && dmOther) {
        queryClient.setQueryData(
          ["conversation-documents", dmOther],
          update,
        );
      } else if (targetType === "GROUP_DOC" && groupId) {
        queryClient.setQueryData(["group-documents", groupId], update);
      } else if (targetType === "TRIP_DOC" && tripId) {
        queryClient.setQueryData(["documents-trip", tripId], update);
      }
    };
    socket.on("reaction_changed", onChange);
    return () => {
      socket.off("reaction_changed", onChange);
    };
  }, [queryClient, dmOther, groupId, tripId]);
}
