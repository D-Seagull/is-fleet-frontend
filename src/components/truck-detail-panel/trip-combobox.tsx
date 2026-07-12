"use client";

import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { fullName } from "@/lib/format";
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
import { TRIP_STATUS_LABELS, type Trip } from "@/hooks/use-trips";
import { ACTIVE_STATUSES } from "./constants";
import { shortenTripTitle } from "./utils";

export function TripCombobox({
  trips,
  value,
  onChange,
  className,
}: {
  trips: Trip[];
  value: string | null;
  onChange: (id: string) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = trips.find((t) => t.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between font-normal overflow-hidden", className)}
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  ACTIVE_STATUSES.includes(selected.status)
                    ? "bg-emerald-500"
                    : "bg-muted-foreground/40",
                )}
              />
              <span className="truncate text-sm">
                {shortenTripTitle(selected.title)}
                {selected.orderNumber && (
                  <span className="text-muted-foreground">
                    {" "}
                    · #{selected.orderNumber}
                  </span>
                )}
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">Select trip...</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search trip..." className="h-9" />
          <CommandList>
            <CommandEmpty>No trips found.</CommandEmpty>
            <CommandGroup>
              {trips.map((t) => (
                <CommandItem
                  key={t.id}
                  value={`${t.title} ${t.orderNumber ?? ""} ${fullName(t.driver) || ""}`}
                  onSelect={() => {
                    onChange(t.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0 mr-2",
                      ACTIVE_STATUSES.includes(t.status)
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="flex-1 truncate">
                    {shortenTripTitle(t.title)}
                    {t.orderNumber && (
                      <span className="text-muted-foreground">
                        {" "}
                        · #{t.orderNumber}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {TRIP_STATUS_LABELS[t.status]}
                  </span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === t.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
