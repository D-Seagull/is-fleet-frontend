"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export interface PersonOption {
  id: string;
  label: string;
  /** Muted text after the name (e.g. the truck plate). */
  hint?: string;
  /** Extra text the search matches on (phone, email…). */
  searchText?: string;
}

export interface PersonGroup {
  heading?: string;
  items: PersonOption[];
}

/**
 * Searchable single-select for people (driver for a truck, teamlead for a
 * manager). Filters by plain substring over label + hint + searchText —
 * cmdk's fuzzy scoring matched too loosely for names, so filtering is ours.
 * `value === null` means the "none" row is selected, `undefined` = not chosen.
 */
export function PersonPicker({
  groups,
  value,
  onChange,
  noneLabel,
  placeholder,
  disabled,
  className,
  contentClassName,
}: {
  groups: PersonGroup[];
  /** null = "none" chosen; undefined = nothing chosen yet (placeholder). */
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  noneLabel: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
}) {
  const t = useTranslations("common.picker");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = useMemo(() => {
    for (const g of groups) {
      const hit = g.items.find((i) => i.id === value);
      if (hit) return hit;
    }
    return null;
  }, [groups, value]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      groups
        .map((g) => ({
          ...g,
          items: q
            ? g.items.filter((i) =>
                `${i.label} ${i.hint ?? ""} ${i.searchText ?? ""}`
                  .toLowerCase()
                  .includes(q),
              )
            : g.items,
        }))
        .filter((g) => g.items.length > 0),
    [groups, q],
  );

  const pick = (id: string | null) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal overflow-hidden", className)}
        >
          <span
            className={cn("truncate", !selected && value !== null && "text-muted-foreground")}
          >
            {selected ? (
              selected.label
            ) : value === null ? (
              noneLabel
            ) : (
              (placeholder ?? noneLabel)
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("p-0 w-[var(--radix-popover-trigger-width)] min-w-[260px]", contentClassName)}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("search")}
            value={query}
            onValueChange={setQuery}
            className="h-9"
          />
          <CommandList>
            {q && filtered.length === 0 && (
              <CommandEmpty>{t("noResults")}</CommandEmpty>
            )}
            {!q && (
              <CommandGroup>
                <CommandItem value="__none__" onSelect={() => pick(null)}>
                  <span className="flex-1 truncate text-muted-foreground">{noneLabel}</span>
                  <Check
                    className={cn("ml-2 h-4 w-4 shrink-0", value === null ? "opacity-100" : "opacity-0")}
                  />
                </CommandItem>
              </CommandGroup>
            )}
            {filtered.map((g, gi) => (
              <CommandGroup key={g.heading ?? gi} heading={g.heading}>
                {g.items.map((i) => (
                  <CommandItem key={i.id} value={i.id} onSelect={() => pick(i.id)}>
                    <span className="flex-1 truncate">
                      {i.label}
                      {i.hint && (
                        <span className="text-muted-foreground"> · {i.hint}</span>
                      )}
                    </span>
                    <Check
                      className={cn("ml-2 h-4 w-4 shrink-0", value === i.id ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Drivers split into "free" (no truck — shown first) and "on trucks" (with
 * the plate as a hint). `currentTruckId` = the truck being edited: its own
 * driver heads the "on trucks" section.
 */
export function driverGroups<
  D extends {
    id: string;
    firstName: string;
    lastName: string | null;
    email?: string | null;
    phone?: string | null;
    currentTruck?: { id: string; plate: string } | null;
  },
>(
  drivers: D[],
  labels: { free: string; onTrucks: string },
  fullName: (d: D) => string | null | undefined,
  currentTruckId?: string,
): PersonGroup[] {
  const free: PersonOption[] = [];
  const busy: PersonOption[] = [];
  const byName = (a: PersonOption, b: PersonOption) => a.label.localeCompare(b.label);
  for (const d of drivers) {
    const opt: PersonOption = {
      id: d.id,
      label: fullName(d) || d.phone || d.email || d.id,
      searchText: `${d.phone ?? ""} ${d.email ?? ""}`,
    };
    if (d.currentTruck) {
      busy.push({ ...opt, hint: d.currentTruck.plate });
    } else {
      free.push(opt);
    }
  }
  busy.sort(byName);
  const own = busy.findIndex((o) => drivers.find((d) => d.id === o.id)?.currentTruck?.id === currentTruckId);
  if (currentTruckId && own > 0) busy.unshift(...busy.splice(own, 1));
  return [
    { heading: labels.free, items: free.sort(byName) },
    { heading: labels.onTrucks, items: busy },
  ];
}
