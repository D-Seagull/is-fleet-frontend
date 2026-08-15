"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useConfirm } from "@/components/confirm-dialog";
import { Bell, Plus, Trash2, Clock, RotateCw, X, Repeat, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";
import {
  type AlarmRecurrence,
  useAlarmsByTruck,
  useCreateAlarm,
  useDeleteAlarm,
  useUpdateAlarm,
} from "@/hooks/use-alarms";
import type { Truck } from "@/hooks/use-trucks";

/** Quick "fire X minutes from now" presets used for both create and reuse.
 *  `key` indexes into alarm.offsets.* for the localised label. */
const QUICK_OFFSETS: { key: string; minutes: number }[] = [
  { key: "off5", minutes: 5 },
  { key: "off15", minutes: 15 },
  { key: "off30", minutes: 30 },
  { key: "off60", minutes: 60 },
  { key: "off120", minutes: 120 },
];

function offsetToLocalInput(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes, 0, 0);
  return toLocalInputValue(d);
}

function offsetToIso(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes, 0, 0);
  return d.toISOString();
}

function formatDateTime(iso: string, locale: string) {
  return new Date(iso).toLocaleString(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

export function AlarmTab({
  truck,
  activeTripId,
}: {
  truck: Truck;
  activeTripId?: string | null;
}) {
  const t = useTranslations("alarm");
  const tActions = useTranslations("common.actions");
  const locale = useLocale();
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const { data: alarms = [], isLoading } = useAlarmsByTruck(truck.id);
  const createAlarm = useCreateAlarm(truck.id);
  const updateAlarm = useUpdateAlarm(truck.id);
  const deleteAlarm = useDeleteAlarm(truck.id);

  // Start at "right now" — the manager picks the target time from there.
  const defaultTime = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    return toLocalInputValue(d);
  }, []);

  const [showForm, setShowForm] = useState(false);
  const [target, setTarget] = useState<"self" | "driver">("self");
  // Prefill the title with the truck's plate so it's clear which vehicle the
  // alarm belongs to.
  const [title, setTitle] = useState(truck.plate ?? "");
  const [note, setNote] = useState("");
  const [time, setTime] = useState(defaultTime);
  const [recurrence, setRecurrence] = useState<AlarmRecurrence>("NONE");
  const [linkToTrip, setLinkToTrip] = useState(false);

  function resetForm() {
    setTitle(truck.plate ?? "");
    setNote("");
    setTime(defaultTime);
    setRecurrence("NONE");
    setTarget("self");
    setLinkToTrip(false);
  }

  function toggleForm() {
    if (!showForm && !title.trim() && truck.plate) setTitle(truck.plate);
    setShowForm((v) => !v);
  }

  async function handleCreate() {
    if (!user || !title.trim()) return;
    let targetUserId: string | undefined;
    if (target === "self") targetUserId = user.id;
    else if (target === "driver") {
      targetUserId = truck.currentDriver?.id;
      if (!targetUserId) {
        alert(t("noDriverAlert"));
        return;
      }
    }
    if (!targetUserId) return;

    await createAlarm.mutateAsync({
      targetUserId,
      title: title.trim(),
      note: note.trim() || undefined,
      // Send wall-clock (no Z / offset). Backend converts it using the
      // target user's stored timezone, so "08:00" really means "08:00 on
      // the driver's clock", not on the manager's.
      time: `${time}:00`,
      recurrence,
      tripId: linkToTrip && activeTripId ? activeTripId : undefined,
    });

    resetForm();
    setShowForm(false);
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto pr-1 text-xs max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-semibold text-sm">{t("title")}</span>
          <span className="text-muted-foreground">({alarms.length})</span>
        </div>
        <Button
          size="sm"
          variant={showForm ? "ghost" : "default"}
          className="h-7 text-xs px-2"
          onClick={toggleForm}
        >
          {showForm ? (
            <>
              <X className="h-3 w-3 mr-1" /> {tActions("cancel")}
            </>
          ) : (
            <>
              <Plus className="h-3 w-3 mr-1" /> {t("new")}
            </>
          )}
        </Button>
      </div>

      {/* Compact form */}
      {showForm && (
        <div className="rounded-md border bg-muted/30 p-2 flex flex-col gap-1.5 shrink-0">
          <div className="grid grid-cols-2 gap-1.5">
            <Select value={target} onValueChange={(v) => setTarget(v as "self" | "driver")}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder={t("targetPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="self">{t("self")}</SelectItem>
                <SelectItem value="driver" disabled={!truck.currentDriver}>
                  {fullName(truck.currentDriver) || t("driverNone")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={recurrence} onValueChange={(v) => setRecurrence(v as AlarmRecurrence)}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">{t("recurrence.NONE")}</SelectItem>
                <SelectItem value="DAILY">{t("recurrence.DAILY")}</SelectItem>
                <SelectItem value="WEEKLY">{t("recurrence.WEEKLY")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            className="h-7 text-xs"
            maxLength={120}
          />

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("notePlaceholder")}
            rows={2}
            className="text-xs resize-none min-h-0 py-1.5"
            maxLength={500}
          />

          <Input
            type="datetime-local"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="h-7 text-xs"
          />

          {/* Quick presets — one tap to set "fire X minutes from now". */}
          <div className="flex flex-wrap gap-1">
            {QUICK_OFFSETS.map((q) => (
              <button
                key={q.minutes}
                type="button"
                className="px-2 py-0.5 text-[10px] rounded border hover:bg-accent transition-colors"
                onClick={() => setTime(offsetToLocalInput(q.minutes))}
              >
                {t(`offsets.${q.key}`)}
              </button>
            ))}
          </div>

          {target === "driver" && truck.currentDriver && (
            <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-300/40 rounded px-2 py-1">
              {t("tzWarning", {
                name: fullName(truck.currentDriver) || "—",
                time: time.slice(11),
              })}
            </div>
          )}

          {activeTripId && (
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={linkToTrip}
                onChange={(e) => setLinkToTrip(e.target.checked)}
                className="h-3 w-3"
              />
              {t("linkToTrip")}
            </label>
          )}

          <Button
            size="sm"
            className="h-7 text-xs mt-0.5"
            onClick={handleCreate}
            disabled={createAlarm.isPending || !title.trim()}
          >
            {createAlarm.isPending ? t("creating") : t("create")}
          </Button>
        </div>
      )}

      {/* Compact list */}
      <div className="flex flex-col gap-1.5 min-h-0">
        {isLoading ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : alarms.length === 0 ? (
          <p className="text-muted-foreground text-center py-4 text-xs">
            {t("empty")}
          </p>
        ) : (
          alarms.map((a) => {
            const canEdit = user?.id === a.createdById;
            const canDelete = canEdit || user?.id === a.targetUserId;
            const isMine = a.targetUserId === user?.id;
            // Dim alarms that have already passed (fired, or their time is in
            // the past) so upcoming ones stand out.
            const passed =
              // eslint-disable-next-line react-hooks/purity -- "is this alarm in the past" must read the current time on each render
              a.isSent || new Date(a.time).getTime() < Date.now();
            return (
              <div
                key={a.id}
                className={`rounded border px-2 py-1.5 flex items-start gap-1 ${passed ? "opacity-50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    {isMine && (
                      <span className="inline-flex items-center gap-0.5 shrink-0 rounded bg-primary/15 text-primary text-[9px] leading-none px-1 py-0.5">
                        <User className="h-2.5 w-2.5" />
                        {t("toMe")}
                      </span>
                    )}
                    <span className="font-medium text-xs truncate">{a.title}</span>
                  </div>
                  {a.note && (
                    <div className="text-[11px] text-muted-foreground truncate">
                      {a.note}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDateTime(a.time, locale)}
                    </span>
                    {a.recurrence !== "NONE" && (
                      <span className="flex items-center gap-0.5">
                        <RotateCw className="h-2.5 w-2.5" />
                        {t(`recurrence.${a.recurrence}`)}
                      </span>
                    )}
                    <span>
                      {isMine
                        ? t("toMe")
                        : t("toUser", { name: fullName(a.target) || "—" })}
                    </span>
                  </div>
                </div>

                {/* Reuse: pop the same quick-offset chips, schedule new time. */}
                {canEdit && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        title={t("repeat")}
                      >
                        <Repeat className="h-3 w-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-2" align="end">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        {t("restartIn")}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {QUICK_OFFSETS.map((q) => (
                          <button
                            key={q.minutes}
                            className="px-2 py-1 text-[11px] rounded border hover:bg-accent transition-colors"
                            onClick={() =>
                              updateAlarm.mutate({
                                id: a.id,
                                patch: { time: offsetToIso(q.minutes) },
                              })
                            }
                          >
                            {t(`offsets.${q.key}`)}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}

                {canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={async () => {
                      const ok = await confirm({
                        title: t("deleteConfirm"),
                        confirmText: tActions("delete"),
                        destructive: true,
                      });
                      if (ok) deleteAlarm.mutate(a.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
