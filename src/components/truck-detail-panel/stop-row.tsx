"use client";

import { useState } from "react";
import {
  MapPin,
  X,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Plus,
  PackagePlus,
  PackageMinus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { StopType } from "@/hooks/use-trips";

export interface StopRowData {
  type: StopType;
  name: string; // мітка для WAYPOINT / "Додаткова зупинка"
  address: string;
  ref: string;
  coords: string;
  windowDate: string; // "YYYY-MM-DD"
  windowStart: string; // "HH:mm"
  windowEnd: string; // "HH:mm"
}

/** Порядок типів для попапа вставки. */
export const STOP_TYPES: StopType[] = ["LOADING", "UNLOADING", "WAYPOINT"];

/** i18n-ключі пресетів назв додаткових зупинок (common.waypointPreset.*). */
export const WAYPOINT_PRESET_KEYS = ["customs", "parking", "fuel"] as const;

/** Колір за типом стопа (текст). */
export function stopTypeColor(type: StopType): string {
  if (type === "LOADING") return "text-emerald-600";
  if (type === "UNLOADING") return "text-red-500";
  return "text-amber-600";
}

/** Іконка кнопки типу в попапі. */
function typeIcon(type: StopType) {
  if (type === "LOADING") return PackagePlus;
  if (type === "UNLOADING") return PackageMinus;
  return MapPin;
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

export const emptyStop = (type: StopType = "LOADING"): StopRowData => ({
  type,
  name: "",
  address: "",
  ref: "",
  coords: "",
  windowDate: todayLocal(),
  windowStart: "00:00",
  windowEnd: "00:00",
});

/** Список 3 типів стопа для попапа (вставка нового / зміна типу наявного). */
function TypeMenuList({ onPick }: { onPick: (type: StopType) => void }) {
  const tStopType = useTranslations("common.stopType");
  return (
    <div className="flex flex-col">
      {STOP_TYPES.map((tp) => {
        const Icon = typeIcon(tp);
        return (
          <button
            key={tp}
            type="button"
            onClick={() => onPick(tp)}
            className={cn(
              "flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent transition-colors",
              stopTypeColor(tp),
            )}
          >
            <Icon className="h-4 w-4" />
            {tStopType(tp)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Тонкий роздільник із «+» посередині. Клік відкриває попап із вибором типу,
 * після чого стоп вставляється саме в цю позицію маршруту.
 */
export function InsertStopButton({
  onInsert,
}: {
  onInsert: (type: StopType) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-border" />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full border bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-1">
          <TypeMenuList
            onPick={(tp) => {
              onInsert(tp);
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function StopRow({
  index,
  value,
  onChange,
  onRemove,
  canRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  index: number;
  value: StopRowData;
  onChange: (v: StopRowData) => void;
  onRemove: () => void;
  canRemove: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const t = useTranslations("truckPanel.stop");
  const tStopType = useTranslations("common.stopType");
  const tPreset = useTranslations("common.waypointPreset");
  const [typeOpen, setTypeOpen] = useState(false);
  const color = stopTypeColor(value.type);
  const label =
    value.type === "WAYPOINT"
      ? value.name || tStopType("WAYPOINT")
      : tStopType(value.type);

  function set(field: keyof StopRowData, val: string) {
    onChange({ ...value, [field]: val });
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Popover open={typeOpen} onOpenChange={setTypeOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              title={t("changeType")}
              className={cn(
                "text-xs font-medium flex items-center gap-1 min-w-0 rounded px-1 -mx-1 py-0.5 hover:bg-accent transition-colors",
                color,
              )}
            >
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {index + 1}. {label}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-52 p-1">
            <TypeMenuList
              onPick={(tp) => {
                onChange({ ...value, type: tp });
                setTypeOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!canMoveUp}
            onClick={onMoveUp}
            title={t("moveUp")}
          >
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            disabled={!canMoveDown}
            onClick={onMoveDown}
            title={t("moveDown")}
          >
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          {canRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onRemove}
              title={t("remove")}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Назва додаткової зупинки + пресети */}
      {value.type === "WAYPOINT" && (
        <div className="flex flex-col gap-1.5">
          <Input
            placeholder={t("namePlaceholder")}
            value={value.name}
            onChange={(e) => set("name", e.target.value)}
          />
          <div className="flex flex-wrap gap-1">
            {WAYPOINT_PRESET_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className="px-2 py-0.5 text-[11px] rounded border hover:bg-accent transition-colors"
                onClick={() => set("name", tPreset(key))}
              >
                {tPreset(key)}
              </button>
            ))}
          </div>
        </div>
      )}

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
      <div className="flex items-center gap-1.5">
        <Input
          type="date"
          value={value.windowDate}
          onChange={(e) => set("windowDate", e.target.value)}
          aria-label={t("date")}
          className="w-[132px] h-8 text-xs px-2"
        />
        <Input
          type="time"
          value={value.windowStart}
          onChange={(e) => set("windowStart", e.target.value)}
          aria-label={t("from")}
          className="w-[104px] h-8 text-xs px-2"
        />
        <span className="text-muted-foreground text-xs">–</span>
        <Input
          type="time"
          value={value.windowEnd}
          onChange={(e) => set("windowEnd", e.target.value)}
          aria-label={t("to")}
          className="w-[104px] h-8 text-xs px-2"
        />
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
