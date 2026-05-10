import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type AlarmRecurrence = "NONE" | "DAILY" | "WEEKLY";

export interface Alarm {
  id: string;
  companyId: string;
  createdById: string;
  targetUserId: string;
  tripId: string | null;
  title: string;
  note: string | null;
  time: string;
  recurrence: AlarmRecurrence;
  isSent: boolean;
  createdAt: string;
  updatedAt: string;
  creator: { id: string; name: string | null; role: string };
  target: { id: string; name: string | null; role: string };
  trip: { id: string; title: string; truckId: string } | null;
}

export interface CreateAlarmPayload {
  targetUserId: string;
  title: string;
  note?: string;
  time: string;
  tripId?: string;
  recurrence?: AlarmRecurrence;
}

export const alarmKeys = {
  all: ["alarms"] as const,
  truck: (truckId: string) => ["alarms", "truck", truckId] as const,
  trip: (tripId: string) => ["alarms", "trip", tripId] as const,
  my: () => ["alarms", "my"] as const,
  created: () => ["alarms", "created"] as const,
};

export function useAlarmsByTruck(truckId: string | null | undefined) {
  return useQuery<Alarm[]>({
    queryKey: alarmKeys.truck(truckId ?? ""),
    queryFn: async () => {
      const res = await api.get(`/alarms/truck/${truckId}`);
      return res.data;
    },
    enabled: !!truckId,
  });
}

export function useMyAlarms() {
  return useQuery<Alarm[]>({
    queryKey: alarmKeys.my(),
    queryFn: async () => {
      const res = await api.get("/alarms/my");
      return res.data;
    },
  });
}

export function useCreateAlarm(truckId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateAlarmPayload) => {
      const res = await api.post("/alarms", payload);
      return res.data as Alarm;
    },
    onSuccess: () => {
      if (truckId) qc.invalidateQueries({ queryKey: alarmKeys.truck(truckId) });
      qc.invalidateQueries({ queryKey: alarmKeys.my() });
      qc.invalidateQueries({ queryKey: alarmKeys.created() });
    },
  });
}

export interface UpdateAlarmPayload {
  title?: string;
  note?: string;
  time?: string;
  recurrence?: AlarmRecurrence;
}

export function useUpdateAlarm(truckId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: UpdateAlarmPayload }) => {
      const res = await api.patch(`/alarms/${id}`, patch);
      return res.data as Alarm;
    },
    onSuccess: () => {
      if (truckId) qc.invalidateQueries({ queryKey: alarmKeys.truck(truckId) });
      qc.invalidateQueries({ queryKey: alarmKeys.my() });
      qc.invalidateQueries({ queryKey: alarmKeys.created() });
    },
  });
}

export function useDeleteAlarm(truckId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/alarms/${id}`);
      return id;
    },
    onSuccess: () => {
      if (truckId) qc.invalidateQueries({ queryKey: alarmKeys.truck(truckId) });
      qc.invalidateQueries({ queryKey: alarmKeys.my() });
      qc.invalidateQueries({ queryKey: alarmKeys.created() });
    },
  });
}
