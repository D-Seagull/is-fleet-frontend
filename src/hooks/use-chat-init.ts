"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { api } from "@/lib/api";
import type { Conversation } from "@/hooks/use-direct-messages";
import type { DmUnreadSummary } from "@/hooks/use-dm-unread";
import { DM_UNREAD_QUERY_KEY } from "@/hooks/use-dm-unread";
import type { GroupUnreadSummary } from "@/hooks/use-group-unread";
import { GROUP_UNREAD_QUERY_KEY } from "@/hooks/use-group-unread";
import type { UnreadSummary } from "@/hooks/use-unread";
import { UNREAD_QUERY_KEY } from "@/hooks/use-unread";

interface ChatInitPayload {
  conversations: Conversation[];
  dmUnread: DmUnreadSummary;
  groupUnread: GroupUnreadSummary;
  /**
   * Manager flavour for ADMIN/TEAMLEAD/MANAGER, driver flavour for DRIVER.
   * The UI only consumes the role-appropriate one, so the union is fine.
   */
  tripUnread: UnreadSummary | unknown;
}

const CHAT_INIT_QUERY_KEY = ["chat-init"] as const;

/**
 * Single round-trip for the /chat page's initial data — replaces 4
 * separate fetches (conversations + 3 unread summaries) that previously
 * fired in parallel on mount and competed for the connection pool.
 *
 * On success the response is fan-out written into the existing query
 * caches, so the older `useConversations` / `useDmUnreadSummary` /
 * `useGroupUnreadSummary` / `useUnreadSummary` hooks read from cache
 * instantly without firing their own network request.
 */
export function useChatInit() {
  const queryClient = useQueryClient();

  const query = useQuery<ChatInitPayload>({
    queryKey: CHAT_INIT_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get("/chat/init");
      return res.data;
    },
    staleTime: 60_000,
  });

  // Fan-out the aggregated payload into the existing caches so the
  // dependent hooks observe a populated cache and skip their fetches.
  useEffect(() => {
    if (!query.data) return;
    queryClient.setQueryData(["conversations"], query.data.conversations);
    queryClient.setQueryData(DM_UNREAD_QUERY_KEY, query.data.dmUnread);
    queryClient.setQueryData(GROUP_UNREAD_QUERY_KEY, query.data.groupUnread);
    queryClient.setQueryData(UNREAD_QUERY_KEY, query.data.tripUnread);
  }, [query.data, queryClient]);

  return query;
}
