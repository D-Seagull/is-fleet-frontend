"use client";

import { MapPin, X, Copy, ExternalLink, Clock } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { StopType } from "@/hooks/use-trips";

export interface StopRowData {
  address: string;
  ref: string;
  coords: string;
  windowDate: string; // "YYYY-MM-DD"
  windowStart: string; // "HH:mm"
  windowEnd: string; // "HH:mm"
}

/** Today in the user's local timezone as YYYY-MM-DD (не toISOString — той дає UTC). */
export function todayLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Quick-pick chips for the window start. label — без нуля спереду, value — HH:mm для <input type="time">. */
export const TIME_PRESETS: { label: string; value: string }[] = [
  { label: "8:00", value: "08:00" },
  { label: "8:30", value: "08:30" },
  { label: "9:00", value: "09:00" },
  { label: "9:30", value: "09:30" },
];

export const emptyStop = (): StopRowData => ({
  address: "",
  ref: "",
  coords: "",
  windowDate: todayLocal(),
  windowStart: "00:00",
  windowEnd: "00:00",
});

export function StopRow({
  index,
  type,
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  type: StopType;
  value: StopRowData;
  onChange: (v: StopRowData) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const t = useTranslations("truckPanel.stop");
  const tStopType = useTranslations("common.stopType");
  const color = type === "LOADING" ? "text-emerald-500" : "text-red-500";

  function set(field: keyof StopRowData, val: string) {
    onChange({ ...value, [field]: val });
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span
          className={cn("text-xs font-medium flex items-center gap-1", color)}
        >
          <MapPin className="h-3.5 w-3.5" />
          {tStopType(type)} {index + 1}
        </span>
        {canRemove && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        )}
      </div>
      <Textarea
        placeholder={t("addressPlaceholder")}
        value={value.address}
        onChange={(e) => set("address", e.target.value)}
        rows={2}
        className="resize-none"
      />
      <div className="flex items-center gap-2">
        <Input
          placeholder={t("refPlaceholder")}
          value={value.ref}
          onChange={(e) => set("ref", e.target.value)}
          className="w-36"
        />
        <Input
          placeholder={t("coordsPlaceholder")}
          value={value.coords}
          onChange={(e) => set("coords", e.target.value)}
          className="flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!value.coords}
          onClick={() => navigator.clipboard.writeText(value.coords)}
          title={t("copyCoords")}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          disabled={!value.coords}
          onClick={() =>
            window.open(
              `https://www.google.com/maps?q=${value.coords}`,
              "_blank",
            )
          }
          title={t("openInMaps")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={value.windowDate}
          onChange={(e) => set("windowDate", e.target.value)}
          aria-label={t("date")}
          className="w-40"
        />
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <Input
            type="time"
            value={value.windowStart}
            onChange={(e) => set("windowStart", e.target.value)}
            aria-label={t("from")}
            className="w-28"
          />
          <span className="text-muted-foreground">–</span>
          <Input
            type="time"
            value={value.windowEnd}
            onChange={(e) => set("windowEnd", e.target.value)}
            aria-label={t("to")}
            className="w-28"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {TIME_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            className="px-2 py-0.5 text-[11px] rounded border hover:bg-accent transition-colors"
            onClick={() => set("windowStart", p.value)}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
