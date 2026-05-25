import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GroupManager {
  id: string;
  manager: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

export interface ManagerGroup {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  managers: GroupManager[];
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  createdAt: string;
  deletedAt?: string | null;
  sender: {
    id: string;
    name: string | null;
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

// ─── Group Messages ───────────────────────────────────────────────────────────

export function useDeleteGroupMessage() {
  return useMutation({
    mutationFn: async (messageId: string) => {
      await api.delete(`/group-messages/messages/${messageId}`);
    },
  });
}

export function useGroupMessages(groupId: string) {
  return useQuery<GroupMessage[]>({
    queryKey: ["group-messages", groupId],
    queryFn: async () => {
      const res = await api.get(`/group-messages/${groupId}`);
      return res.data;
    },
    enabled: !!groupId,
  });
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
