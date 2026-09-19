"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { AlertTriangle, ArrowLeftRight, Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusDot } from "@/components/status-dot";
import { useTrucks } from "@/hooks/use-trucks";
import {
  useAssignTruck,
  type TargetTruckBusy,
  type Trip,
  type TruckConflictStrategy,
} from "@/hooks/use-trips";
import { shortenTripTitle } from "./utils";

/**
 * Витягує 409-тіло з axios-помилки, якщо це саме конфлікт зайнятої машини.
 * Глобальний фільтр помилок бекенду перепаковує кинуте тіло під `message`,
 * тож payload приходить вкладеним; читаємо обидві форми.
 */
function readConflict(error: unknown): TargetTruckBusy | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 409) return null;
  const data = error.response.data as
    | { code?: string; message?: unknown }
    | undefined;
  const body = (
    data && typeof data.message === "object" && data.message !== null
      ? data.message
      : data
  ) as Partial<TargetTruckBusy> | undefined;
  return body?.code === "TARGET_TRUCK_BUSY" ? (body as TargetTruckBusy) : null;
}

function readMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  const message = (error.response?.data as { message?: unknown })?.message;
  if (typeof message === "string") return message;
  if (Array.isArray(message) && typeof message[0] === "string") return message[0];
  // Nested envelope: { message: { code, message, trip } }.
  if (message && typeof message === "object") {
    const inner = (message as { message?: unknown }).message;
    if (typeof inner === "string") return inner;
  }
  return fallback;
}

/**
 * Перепризначення рейсу на іншу вантажівку. Водій їде разом з машиною,
 * менеджер лишається той самий і зберігає всю переписку; попередній водій
 * втрачає рейс повністю.
 *
 * Якщо цільова машина вже в рейсі, бекенд відмовляє з 409 — діалог показує
 * другим кроком зустрічний рейс і два виходи замість того, щоб мовчки
 * переписати чужу роботу.
 */
export function ReassignTruckDialog({
  trip,
  open,
  onOpenChange,
}: {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("truckPanel.trips.reassign");
  const tActions = useTranslations("common.actions");
  const tStatus = useTranslations("common.tripStatus");
  const { data: trucks, isLoading } = useTrucks();
  const assignTruck = useAssignTruck();

  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conflict, setConflict] = useState<TargetTruckBusy | null>(null);

  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (trucks ?? [])
      .filter((truck) => truck.id !== trip.truck?.id)
      .filter((truck) => {
        if (!q) return true;
        return (
          truck.plate.toLowerCase().includes(q) ||
          fullName(truck.currentDriver).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.plate.localeCompare(b.plate));
  }, [trucks, search, trip.truck?.id]);

  function reset() {
    setSearch("");
    setSelectedId(null);
    setConflict(null);
  }

  function close() {
    reset();
    onOpenChange(false);
  }

  async function submit(onConflict?: TruckConflictStrategy) {
    const targetTruckId = selectedId;
    if (!targetTruckId) return;
    const plate = (trucks ?? []).find((x) => x.id === targetTruckId)?.plate ?? "";
    try {
      await assignTruck.mutateAsync({
        id: trip.id,
        targetTruckId,
        onConflict,
      });
      toast.success(t("success", { plate }));
      close();
    } catch (error) {
      const busy = readConflict(error);
      if (busy) {
        setConflict(busy);
        return;
      }
      toast.error(readMessage(error, t("error")));
    }
  }

  const selectedPlate =
    (trucks ?? []).find((x) => x.id === selectedId)?.plate ?? "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        {conflict ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                {t("conflictTitle", { plate: selectedPlate })}
              </DialogTitle>
              <DialogDescription>{t("conflictBody")}</DialogDescription>
            </DialogHeader>

            <div className="rounded-lg bg-muted/50 px-3 py-2">
              <p className="text-sm">
                {shortenTripTitle(conflict.trip.title)}
                {conflict.trip.orderNumber && (
                  <span className="text-muted-foreground">
                    {" "}
                    · #{conflict.trip.orderNumber}
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {conflict.trip.driverName || "—"} ·{" "}
                {tStatus(conflict.trip.status)}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                className="rounded-lg border px-3 py-2 text-left hover:bg-accent transition-colors disabled:opacity-60"
                disabled={assignTruck.isPending}
                onClick={() => submit("SWAP")}
              >
                <span className="text-sm font-medium">{t("swap")}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t("swapHint", { plate: trip.truck?.plate ?? "" })}
                </span>
              </button>
              <button
                className="rounded-lg border px-3 py-2 text-left hover:bg-accent transition-colors disabled:opacity-60"
                disabled={assignTruck.isPending}
                onClick={() => submit("COMPLETE_OTHER")}
              >
                <span className="text-sm font-medium">{t("completeOther")}</span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {t("completeOtherHint")}
                </span>
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                {tActions("cancel")}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">{t("title")}</DialogTitle>
              <DialogDescription>
                {t("subtitle", {
                  trip: shortenTripTitle(trip.title),
                  plate: trip.truck?.plate ?? "—",
                })}
              </DialogDescription>
            </DialogHeader>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                autoFocus
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border divide-y">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : candidates.length === 0 ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {t("noTrucks")}
                </p>
              ) : (
                candidates.map((truck) => {
                  // Без водія бекенд усе одно відмовить — рядок неактивний.
                  const noDriver = !truck.currentDriver;
                  const busy = (truck.trips?.length ?? 0) > 0;
                  return (
                    <button
                      key={truck.id}
                      disabled={noDriver}
                      onClick={() => setSelectedId(truck.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-left transition-colors",
                        // Вибір позначаємо тихо: підкладка + тонка рамка,
                        // без заливки акцентом на всю ширину рядка.
                        selectedId === truck.id
                          ? "bg-muted ring-1 ring-inset ring-primary/40"
                          : "hover:bg-muted/50",
                        noDriver && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{truck.plate}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          {truck.currentDriver ? (
                            <>
                              <StatusDot user={truck.currentDriver} size="xs" />
                              {fullName(truck.currentDriver)}
                            </>
                          ) : (
                            t("noDriver")
                          )}
                        </p>
                      </div>
                      {busy && (
                        <span className="shrink-0 text-[10px] rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5">
                          {t("busy")}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={close}>
                {tActions("cancel")}
              </Button>
              <Button
                disabled={!selectedId || assignTruck.isPending}
                onClick={() => submit()}
              >
                {assignTruck.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {t("confirm")}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Іконка-тригер у ряду дій картки рейсу. */
export function ReassignTruckButton({ trip }: { trip: Trip }) {
  const t = useTranslations("truckPanel.trips.reassign");
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        title={t("title")}
        aria-label={t("title")}
        onClick={() => setOpen(true)}
      >
        <ArrowLeftRight className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      <ReassignTruckDialog trip={trip} open={open} onOpenChange={setOpen} />
    </>
  );
}
