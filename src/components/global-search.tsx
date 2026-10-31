"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { Command as CommandPrimitive } from "cmdk";
import { Route, Search, Truck, User } from "lucide-react";
import { useTrucks } from "@/hooks/use-trucks";
import { useDrivers } from "@/hooks/use-drivers";
import { useTrips } from "@/hooks/use-trips";
import { truckHref } from "@/lib/truck-link";
import { fullName } from "@/lib/format";
import { LicensePlate } from "@/components/license-plate";
import { StatusBadge } from "@/components/status-badge";

// Per section — enough to find the one you meant, short enough to scan.
const MAX_PER_GROUP = 5;

const norm = (v: string | null | undefined) =>
  (v ?? "").toLowerCase().replace(/\s+/g, "");

/**
 * Header search over trucks (plate, driver), drivers (name, phone) and trips
 * (title, order number, plate). Lists are the ones the pages already load;
 * nothing is fetched until the field is first focused.
 */
export function GlobalSearch() {
  const t = useTranslations("search");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Mounting the results is what starts the fetches — only once it's used.
  const [touched, setTouched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <CommandPrimitive
      shouldFilter={false}
      loop
      className="relative w-full max-w-[440px]"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          inputRef.current?.blur();
        }
      }}
    >
      <div className="flex h-10 items-center gap-2 rounded-full border bg-muted px-4 transition-colors focus-within:border-ring focus-within:bg-background">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <CommandPrimitive.Input
          ref={inputRef}
          value={query}
          onValueChange={(v) => {
            setQuery(v);
            setOpen(true);
          }}
          onFocus={() => {
            setTouched(true);
            setOpen(true);
          }}
          // Let a click on a result land before the list goes away.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          placeholder={t("placeholder")}
          className="h-full w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {touched && open && query.trim().length > 0 && (
        <SearchResults
          query={query}
          onPick={() => {
            setOpen(false);
            setQuery("");
            inputRef.current?.blur();
          }}
        />
      )}
    </CommandPrimitive>
  );
}

function SearchResults({
  query,
  onPick,
}: {
  query: string;
  onPick: () => void;
}) {
  const t = useTranslations("search");
  const tTripStatus = useTranslations("common.tripStatus");
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: trucks, isLoading: trucksLoading } = useTrucks();
  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { data: trips, isLoading: tripsLoading } = useTrips();
  const loading = trucksLoading || driversLoading || tripsLoading;

  const q = norm(query);
  const truckHits = (trucks ?? [])
    .filter(
      (tr) =>
        norm(tr.plate).includes(q) || norm(fullName(tr.currentDriver)).includes(q),
    )
    .slice(0, MAX_PER_GROUP);
  const driverHits = (drivers ?? [])
    .filter((d) => norm(fullName(d)).includes(q) || norm(d.phone).includes(q))
    .slice(0, MAX_PER_GROUP);
  const tripHits = (trips ?? [])
    .filter(
      (tr) =>
        norm(tr.title).includes(q) ||
        norm(tr.orderNumber).includes(q) ||
        norm(tr.truck?.plate).includes(q),
    )
    .slice(0, MAX_PER_GROUP);

  function go(href: string) {
    onPick();
    router.push(href);
  }

  const groupClass =
    "px-1.5 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground";
  const itemClass =
    "flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-2 text-sm data-[selected=true]:bg-accent";

  return (
    <CommandPrimitive.List className="absolute left-0 right-0 top-12 z-50 max-h-[420px] overflow-y-auto rounded-2xl border bg-popover p-1 text-popover-foreground shadow-lg">
      {loading && truckHits.length + driverHits.length + tripHits.length === 0 ? (
        <CommandPrimitive.Loading>
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("loading")}
          </p>
        </CommandPrimitive.Loading>
      ) : (
        <CommandPrimitive.Empty className="py-6 text-center text-sm text-muted-foreground">
          {t("nothingFound")}
        </CommandPrimitive.Empty>
      )}
      {truckHits.length > 0 && (
        <CommandPrimitive.Group heading={t("trucks")} className={groupClass}>
          {truckHits.map((tr) => (
            <CommandPrimitive.Item
              key={tr.id}
              value={`truck-${tr.id}`}
              onSelect={() => go(truckHref(queryClient, tr.id, "chat"))}
              className={itemClass}
            >
              <Truck className="h-4 w-4 shrink-0 text-muted-foreground" />
              <LicensePlate plate={tr.plate} />
              <span className="truncate text-muted-foreground">
                {fullName(tr.currentDriver)}
              </span>
            </CommandPrimitive.Item>
          ))}
        </CommandPrimitive.Group>
      )}
      {driverHits.length > 0 && (
        <CommandPrimitive.Group heading={t("drivers")} className={groupClass}>
          {driverHits.map((d) => (
            <CommandPrimitive.Item
              key={d.id}
              value={`driver-${d.id}`}
              onSelect={() => go(`/drivers/${d.id}`)}
              className={itemClass}
            >
              <User className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate font-medium">{fullName(d)}</span>
              {d.currentTruck && (
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                  {d.currentTruck.plate}
                </span>
              )}
            </CommandPrimitive.Item>
          ))}
        </CommandPrimitive.Group>
      )}
      {tripHits.length > 0 && (
        <CommandPrimitive.Group heading={t("trips")} className={groupClass}>
          {tripHits.map((tr) => (
            <CommandPrimitive.Item
              key={tr.id}
              value={`trip-${tr.id}`}
              onSelect={() => go(truckHref(queryClient, tr.truckId, "trips"))}
              className={itemClass}
            >
              <Route className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate">
                {tr.title}
                {tr.orderNumber && (
                  <span className="text-muted-foreground"> · #{tr.orderNumber}</span>
                )}
              </span>
              <StatusBadge status={tr.status}>{tTripStatus(tr.status)}</StatusBadge>
            </CommandPrimitive.Item>
          ))}
        </CommandPrimitive.Group>
      )}
    </CommandPrimitive.List>
  );
}
