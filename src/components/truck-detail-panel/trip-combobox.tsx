"use client";

import { useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { useTranslations } from "next-intl";
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
import { type Trip } from "@/hooks/use-trips";
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
  const t = useTranslations("truckPanel.trips");
  const tStatus = useTranslations("common.tripStatus");
  const [open, setOpen] = useState(false);
  const selected = trips.find((tr) => tr.id === value);

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
            <span className="text-muted-foreground text-sm">{t("selectTrip")}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)]"
        align="start"
      >
        <Command>
          <CommandInput placeholder={t("searchTrip")} className="h-9" />
          <CommandList>
            <CommandEmpty>{t("noTripsFound")}</CommandEmpty>
            <CommandGroup>
              {trips.map((tr) => (
                <CommandItem
                  key={tr.id}
                  value={`${tr.title} ${tr.orderNumber ?? ""} ${fullName(tr.driver) || ""}`}
                  onSelect={() => {
                    onChange(tr.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0 mr-2",
                      ACTIVE_STATUSES.includes(tr.status)
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="flex-1 truncate">
                    {shortenTripTitle(tr.title)}
                    {tr.orderNumber && (
                      <span className="text-muted-foreground">
                        {" "}
                        · #{tr.orderNumber}
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {tStatus(tr.status)}
                  </span>
                  <Check
                    className={cn(
                      "ml-2 h-4 w-4 shrink-0",
                      value === tr.id ? "opacity-100" : "opacity-0",
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
