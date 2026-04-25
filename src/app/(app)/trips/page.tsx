"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Paperclip, MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useTrips,
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
  type Trip,
} from "@/hooks/use-trips";

function StopsCell({ stops }: { stops: Trip["stops"] }) {
  if (stops.length === 0)
    return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-col gap-0.5 max-w-[260px]">
      {stops.map((stop, i) => (
        <div key={stop.id} className="flex items-start gap-1.5 text-xs">
          <span
            className={`shrink-0 mt-0.5 font-medium ${
              stop.type === "LOADING" ? "text-blue-500" : "text-orange-500"
            }`}
          >
            {i + 1}.
          </span>
          <span className="text-muted-foreground truncate">
            {stop.address ?? "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

function AttachmentsCell({ documents }: { documents: Trip["documents"] }) {
  if (documents.length === 0)
    return <span className="text-muted-foreground">—</span>;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-1 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {documents.length}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="max-w-[240px]">
          <div className="flex flex-col gap-1">
            {documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs hover:underline truncate"
              >
                {doc.fileName}
              </a>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function TripsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();

  const { data: trips, isLoading } = useTrips();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trips ?? [];
    return (trips ?? []).filter((t) => {
      if ((t.orderNumber ?? "").toLowerCase().includes(q)) return true;
      if (t.title.toLowerCase().includes(q)) return true;
      if ((t.truck.plate ?? "").toLowerCase().includes(q)) return true;
      if ((t.driver.name ?? "").toLowerCase().includes(q)) return true;
      if (t.stops.some((s) => (s.address ?? "").toLowerCase().includes(q)))
        return true;
      return false;
    });
  }, [trips, searchQuery]);

  return (
    <div className="flex flex-col p-4 gap-6">
      <h1 className="text-2xl font-bold">Trips</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by trip number, name, truck, driver, address..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Order #</TableHead>
              <TableHead className="w-[180px]">Trip</TableHead>
              <TableHead className="hidden md:table-cell w-[120px]">Status</TableHead>
              <TableHead className="w-[110px]">Truck</TableHead>
              <TableHead className="hidden md:table-cell w-[150px]">Driver</TableHead>
              <TableHead className="hidden md:table-cell">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Addresses
                </div>
              </TableHead>
              <TableHead className="hidden md:table-cell w-[70px]">
                <div className="flex items-center gap-1">
                  <Paperclip className="h-3.5 w-3.5" />
                  Files
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                >
                  {searchQuery ? "No trips match your search." : "No trips yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((trip) => (
                <TableRow
                  key={trip.id}
                  className="align-top cursor-pointer"
                  onClick={() => router.push(`/trips/${trip.id}`)}
                >
                  {/* Order # */}
                  <TableCell className="py-2 md:py-3">
                    {trip.orderNumber ? (
                      <span className="font-mono text-xs md:text-sm">{trip.orderNumber}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs md:text-sm">—</span>
                    )}
                  </TableCell>

                  {/* Trip title + date */}
                  <TableCell className="py-2 md:py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-xs md:text-sm">{trip.title}</span>
                      <span className="text-[11px] md:text-xs text-muted-foreground">
                        {new Date(trip.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="hidden md:table-cell py-3">
                    <Badge
                      variant="outline"
                      className={TRIP_STATUS_COLORS[trip.status]}
                    >
                      {TRIP_STATUS_LABELS[trip.status]}
                    </Badge>
                  </TableCell>

                  {/* Truck */}
                  <TableCell className="py-2 md:py-3" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/trucks/${trip.truck.id}?tab=info`}
                      className="text-xs md:text-sm hover:underline"
                    >
                      {trip.truck.plate}
                    </Link>
                  </TableCell>

                  {/* Driver — hidden on mobile */}
                  <TableCell className="hidden md:table-cell py-3" onClick={(e) => e.stopPropagation()}>
                    {trip.driver.name ? (
                      <Link
                        href={`/drivers/${trip.driver.id}`}
                        className="text-sm hover:underline"
                      >
                        {trip.driver.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Addresses — hidden on mobile */}
                  <TableCell className="hidden md:table-cell py-3">
                    <StopsCell stops={trip.stops} />
                  </TableCell>

                  {/* Files — hidden on mobile */}
                  <TableCell className="hidden md:table-cell py-3">
                    <AttachmentsCell documents={trip.documents} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
