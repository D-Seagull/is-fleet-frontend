import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface GroupDispatcher {
  id: string;
  dispatcher: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface DispatcherGroup {
  id: string;
  name: string;
  type: string;
  createdBy: string;
  dispatchers: GroupDispatcher[];
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: {
    id: string;
    name: string | null;
    role: string;
  };
}

// ─── Groups ───────────────────────────────────────────────────────────────────

export function useDispatcherGroups() {
  return useQuery<DispatcherGroup[]>({
    queryKey: ["dispatcher-groups"],
    queryFn: async () => {
      const res = await api.get("/groups/dispatchers");
      return res.data;
    },
  });
}

export function useGroup(id: string) {
  return useQuery<DispatcherGroup>({
    queryKey: ["dispatcher-groups", id],
    queryFn: async () => {
      const res = await api.get("/groups/dispatchers");
      const groups: DispatcherGroup[] = res.data;
      return groups.find((g) => g.id === id)!;
    },
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      const res = await api.post("/groups", { name, type: "DISPATCHERS" });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatcher-groups"] });
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
      queryClient.invalidateQueries({ queryKey: ["dispatcher-groups"] });
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
      queryClient.invalidateQueries({ queryKey: ["dispatcher-groups"] });
    },
  });
}

export function useAddDispatcherToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      dispatcherId,
    }: {
      groupId: string;
      dispatcherId: string;
    }) => {
      const res = await api.post(
        `/groups/${groupId}/dispatchers/${dispatcherId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatcher-groups"] });
    },
  });
}

export function useRemoveDispatcherFromGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      dispatcherId,
    }: {
      groupId: string;
      dispatcherId: string;
    }) => {
      const res = await api.delete(
        `/groups/${groupId}/dispatchers/${dispatcherId}`,
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatcher-groups"] });
    },
  });
}

// ─── Group Messages ───────────────────────────────────────────────────────────

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
  return useQuery<DispatcherGroup[]>({
    queryKey: ["dispatcher-groups"],
    queryFn: async () => {
      const res = await api.get("/groups/dispatchers");
      return res.data;
    },
  });
}
