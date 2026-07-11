import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { api } from "@/lib/api";
import {
  flattenInfinitePages,
  patchInfiniteMessage,
} from "@/lib/infinite-messages";

const GROUP_PAGE_SIZE = 50;

export interface GroupManager {
  id: string;
  manager: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
    status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
    statusUntil?: string | null;
    email: string;
    role: string;
  };
}

export interface ManagerGroup {
  id: string;
  name: string;
  avatar: string | null;
    status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
    statusUntil?: string | null;
  type: string;
  createdBy: string;
  managers: GroupManager[];
}

export interface GroupMessageReplyPreview {
  id: string;
  content: string;
  deletedAt: string | null;
  sender: { id: string; firstName: string; lastName: string | null; avatar: string | null };
}

export interface GroupDocReplyPreviewLite {
  id: string;
  fileName: string;
  fileType: "PHOTO" | "DOCUMENT";
  deletedAt: string | null;
  uploader: { id: string; firstName: string; lastName: string | null; avatar: string | null };
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  /** Backend-authored notices ("added X", "removed X"). Rendered as a
   * centred muted line, no bubble / avatar / reply affordances. */
  isSystem?: boolean;
  createdAt: string;
  deletedAt?: string | null;
  editedAt?: string | null;
  replyToId?: string | null;
  replyTo?: GroupMessageReplyPreview | null;
  replyToDocumentId?: string | null;
  replyToDocument?: GroupDocReplyPreviewLite | null;
  sender: {
    id: string;
    firstName: string;
    lastName: string | null;
    avatar: string | null;
    status?: "ONLINE" | "BUSY" | "AWAY" | "SLEEP" | "VACATION";
    statusUntil?: string | null;
    role: string;
  };
  reactions?: { id: string; userId: string; emoji: string }[];
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export function useManagerGroups() {
  return useQuery<ManagerGroup[]>({
    queryKey: ["manager-groups"],
    queryFn: async () => {
      const res = await api.get("/groups/managers");
      return res.data;
    },
  });
}

export function useGroup(id: string) {
  return useQuery<ManagerGroup>({
    queryKey: ["manager-groups", id],
    queryFn: async () => {
      const res = await api.get("/groups/managers");
      const groups: ManagerGroup[] = res.data;
      return groups.find((g) => g.id === id)!;
    },
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post("/groups", { name, type: "MANAGERS" });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-groups"] });
    },
  });
}

export function useUpdateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await api.patch(`/groups/${id}`, { name });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-groups"] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/groups/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-groups"] });
    },
  });
}

export function useAddManagerToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      managerId,
    }: {
      groupId: string;
      managerId: string;
    }) => {
      const res = await api.post(
        `/groups/${groupId}/managers/${managerId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-groups"] });
    },
  });
}

export function useRemoveManagerFromGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      managerId,
    }: {
      groupId: string;
      managerId: string;
    }) => {
      const res = await api.delete(
        `/groups/${groupId}/managers/${managerId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-groups"] });
    },
  });
}

export function useUploadGroupAvatar(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await api.post(`/groups/${groupId}/avatar`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data as ManagerGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-groups"] });
    },
  });
}

export function useDeleteGroupAvatar(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/groups/${groupId}/avatar`);
      return res.data as ManagerGroup;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manager-groups"] });
    },
  });
}

// ─── Group Messages ───────────────────────────────────────────────────────────

export function useDeleteGroupMessage() {
  return useMutation({
    mutationFn: async (messageId: string) => {
      await api.delete(`/group-messages/messages/${messageId}`);
    },
  });
}

export function useEditGroupMessage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const res = await api.patch(`/group-messages/messages/${id}`, {
        content,
      });
      return res.data as GroupMessage;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<InfiniteData<GroupMessage[]>>(
        ["group-messages", groupId],
        (prev) =>
          patchInfiniteMessage(prev, updated.id, (m) => ({ ...m, ...updated })),
      );
    },
  });
}

/**
 * Paginated group history — same shape as useMessages.
 * `data` stays a flat chronological GroupMessage[]; `fetchOlder` / `hasOlder`
 * drive the "Load older" button.
 */
export function useGroupMessages(groupId: string) {
  const query = useInfiniteQuery<
    GroupMessage[],
    Error,
    InfiniteData<GroupMessage[]>,
    readonly ["group-messages", string],
    string | undefined
  >({
    queryKey: ["group-messages", groupId] as const,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, string> = {};
      if (pageParam) params.before = pageParam;
      const res = await api.get(`/group-messages/${groupId}`, { params });
      return res.data as GroupMessage[];
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => {
      if (!lastPage || lastPage.length < GROUP_PAGE_SIZE) return undefined;
      return lastPage[0]?.createdAt;
    },
    enabled: !!groupId,
  });

  const messages = useMemo(
    () => flattenInfinitePages<GroupMessage>(query.data),
    [query.data],
  );

  return {
    data: messages,
    isLoading: query.isLoading,
    error: query.error,
    fetchOlder: query.fetchNextPage,
    hasOlder: !!query.hasNextPage,
    isFetchingOlder: query.isFetchingNextPage,
  };
}
export function useGroupsForChat() {
  return useQuery<ManagerGroup[]>({
    queryKey: ["manager-groups"],
    queryFn: async () => {
      const res = await api.get("/groups/managers");
      return res.data;
    },
  });
}
