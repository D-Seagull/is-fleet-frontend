"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Time of day as "HH:mm", always 24-hour. The browser's <input type="time">
 * follows the OS / browser locale and showed "4:00 PM" on English systems;
 * this one looks the same everywhere. Digits only, the colon is added for
 * you ("1630" → "16:30"); an impossible time is not accepted.
 */
export function TimeInput24({
  value,
  onChange,
  ariaLabel,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  // Local text while typing; the parent only ever gets a complete, valid time.
  const [text, setText] = useState(value);
  // Follow outside changes (the hour scale) — "store the previous prop"
  // pattern, adjusted during render rather than in an effect.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value);
  }

  const commit = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    if (digits.length < 3) return;
    const padded = digits.length === 3 ? `0${digits}` : digits;
    const h = Number(padded.slice(0, 2));
    const m = Number(padded.slice(2));
    if (h > 23 || m > 59) return;
    onChange(`${padded.slice(0, 2)}:${padded.slice(2)}`);
  };

  return (
    <Input
      inputMode="numeric"
      placeholder="00:00"
      aria-label={ariaLabel}
      value={text}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
        const next =
          digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
        setText(next);
        if (digits.length === 4) commit(digits);
      }}
      onBlur={() => {
        commit(text);
        setText(value);
      }}
      onFocus={(e) => e.target.select()}
      className={cn("tabular-nums", className)}
    />
  );
}

// Working hours a loading / unloading window usually falls in.
const HOURS = Array.from({ length: 15 }, (_, i) => i + 6); // 6 … 20

const hourOf = (hhmm: string) => {
  const h = Number(hhmm.split(":")[0]);
  return Number.isFinite(h) ? h : null;
};
const toHHmm = (h: number) => `${String(h).padStart(2, "0")}:00`;

/**
 * One row of hours: the first click sets the start, the second the end, and
 * the range between them lights up. A click at or before the start begins a
 * new range. Minutes (8:30) go into the HH:mm fields next to it.
 */
export function HourScale({
  start,
  end,
  onChange,
}: {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}) {
  // Which end the next click sets.
  const [next, setNext] = useState<"start" | "end">("start");
  const s = hourOf(start);
  const e = hourOf(end);
  const hasRange = s !== null && e !== null && e > s;

  const pick = (h: number) => {
    if (next === "start" || s === null || h <= s) {
      onChange(toHHmm(h), end && e !== null && e > h ? end : "");
      setNext("end");
    } else {
      onChange(start, toHHmm(h));
      setNext("start");
    }
  };

  return (
    <div className="flex w-full overflow-x-auto rounded-md border text-[11px] tabular-nums">
      {HOURS.map((h) => {
        const isEdge = h === s || (hasRange && h === e);
        const inRange = hasRange && h > s! && h < e!;
        return (
          <button
            key={h}
            type="button"
            onClick={() => pick(h)}
            className={cn(
              "flex-1 min-w-[26px] py-1 transition-colors border-r last:border-r-0",
              isEdge
                ? "bg-primary text-primary-foreground font-semibold"
                : inRange
                  ? "bg-primary/15 text-foreground"
                  : "hover:bg-accent text-muted-foreground",
            )}
            title={toHHmm(h)}
          >
            {h}
          </button>
        );
      })}
    </div>
  );
}
