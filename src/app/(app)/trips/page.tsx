"use client";

import { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { fullName } from "@/lib/format";
import {
  Search,
  Paperclip,
  MapPin,
  Loader2,
  FileText,
  ImageIcon,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  useTrips,
  TRIP_STATUS_LABELS,
  TRIP_STATUS_COLORS,
  type Trip,
} from "@/hooks/use-trips";
import { openDoc, downloadDoc } from "@/lib/doc-helpers";

function StopsCell({ stops }: { stops: Trip["stops"] }) {
  if (stops.length === 0)
    return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-col gap-0.5 max-w-[260px]">
      {stops.map((stop, i) => (
        <div key={stop.id} className="flex items-start gap-1.5 text-xs">
          <span
            className={`shrink-0 mt-0.5 font-medium ${stop.type === "LOADING" ? "text-blue-500" : "text-orange-500"}`}
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

function DocsDropdown({ trip }: { trip: Trip }) {
  if (trip.documents.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.5 py-1">
      {trip.documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/60 transition-colors"
        >
          {doc.fileType === "PHOTO" ? (
            <ImageIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <span
            className="flex-1 text-xs truncate cursor-pointer hover:underline"
            onClick={(e) => {
              e.stopPropagation();
              openDoc(doc.id);
            }}
            title={doc.fileName}
          >
            {doc.fileName}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                openDoc(doc.id);
              }}
              title="View"
              className="p-1 rounded hover:bg-muted"
            >
              <Eye className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadDoc(doc.id);
              }}
              title="Download"
              className="p-1 rounded hover:bg-muted"
            >
              <Download className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const COLS = 8;

export default function TripsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: trips, isLoading } = useTrips();

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trips ?? [];
    return (trips ?? []).filter((t) => {
      if ((t.orderNumber ?? "").toLowerCase().includes(q)) return true;
      if (t.title.toLowerCase().includes(q)) return true;
      if ((t.truck.plate ?? "").toLowerCase().includes(q)) return true;
      if ((fullName(t.driver) ?? "").toLowerCase().includes(q)) return true;
      if ((fullName(t.manager) ?? "").toLowerCase().includes(q)) return true;
      if (t.stops.some((s) => (s.address ?? "").toLowerCase().includes(q)))
        return true;
      return false;
    });
  }, [trips, searchQuery]);

  function toggle(tripId: string) {
    setExpandedId((prev) => (prev === tripId ? null : tripId));
  }

  return (
    <div className="flex flex-col p-4 gap-6">
      <h1 className="text-2xl font-bold">Trips</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by order #, trip, truck, driver, manager..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Order #</TableHead>
              <TableHead className="w-[160px]">Trip</TableHead>
              <TableHead className="hidden md:table-cell w-[110px]">
                Status
              </TableHead>
              <TableHead className="w-[90px]">Truck</TableHead>
              <TableHead className="hidden md:table-cell w-[130px]">
                Driver
              </TableHead>
              <TableHead className="hidden lg:table-cell w-[130px]">
                Manager
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  Addresses
                </div>
              </TableHead>
              <TableHead className="w-[60px] text-center">
                <Paperclip className="h-3.5 w-3.5 mx-auto" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={COLS} className="text-center py-12">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLS}
                  className="text-center py-12 text-muted-foreground"
                >
                  {searchQuery
                    ? "No trips match your search."
                    : "No trips yet."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((trip) => {
                const isExpanded = expandedId === trip.id;
                const hasDocs = trip.documents.length > 0;
                return (
                  <Fragment key={trip.id}>
                    <TableRow
                      className="align-middle cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => toggle(trip.id)}
                    >
                      {/* Order # */}
                      <TableCell className="py-2 md:py-3">
                        {trip.orderNumber ? (
                          <span className="font-mono text-xs md:text-sm">
                            {trip.orderNumber}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs md:text-sm">
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Trip title + date */}
                      <TableCell className="py-2 md:py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-xs md:text-sm leading-tight">
                            {trip.title}
                          </span>
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
                      <TableCell
                        className="py-2 md:py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Link
                          href={`/trucks/${trip.truck.id}?tab=info`}
                          className="text-xs md:text-sm hover:underline"
                        >
                          {trip.truck.plate}
                        </Link>
                      </TableCell>

                      {/* Driver */}
                      <TableCell className="hidden md:table-cell py-3">
                        <span className="text-sm">
                          {fullName(trip.driver) ?? "—"}
                        </span>
                      </TableCell>

                      {/* Manager */}
                      <TableCell className="hidden lg:table-cell py-3">
                        <span className="text-sm">
                          {fullName(trip.manager) ?? "—"}
                        </span>
                      </TableCell>

                      {/* Addresses */}
                      <TableCell className="hidden lg:table-cell py-3">
                        <StopsCell stops={trip.stops} />
                      </TableCell>

                      {/* Docs toggle */}
                      <TableCell className="py-2 text-center">
                        {hasDocs ? (
                          <div className="flex items-center justify-center gap-1 text-muted-foreground">
                            <Paperclip className="h-3.5 w-3.5" />
                            <span className="text-xs">
                              {trip.documents.length}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded docs row */}
                    {isExpanded && hasDocs && (
                      <TableRow
                        key={`${trip.id}-docs`}
                        className="bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-l-blue-400/60"
                      >
                        <TableCell colSpan={COLS} className="py-0 px-4">
                          <DocsDropdown trip={trip} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
