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
      const res = await api.post(
        `${REACT_ENDPOINT[type]}/${messageId}/react`,
        { emoji },
      );
      return res.data as MessageReactionRow[];
    },
    onSuccess: () => {
      // Force refetch of any open message lists or document lists so the
      // UI reflects the toggle instantly (without waiting for the socket
      // round-trip).
      void queryClient.invalidateQueries({
        predicate: (q) => {
          const key = q.queryKey[0];
          return (
            key === "messages" ||
            key === "group-messages" ||
            key === "trip-messages" ||
            key === "conversation-documents" ||
            key === "group-documents" ||
            key === "documents-trip"
          );
        },
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
