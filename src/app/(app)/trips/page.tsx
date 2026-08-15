"use client";

import { useState, useMemo, Fragment } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { fullName } from "@/lib/format";
import {
  Search,
  Paperclip,
  MapPin,
  FileText,
  ImageIcon,
  Eye,
  Download,
  ChevronDown,
  ChevronUp,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  useDeleteTrip,
  tripLoadingDate,
  TRIP_STATUS_COLORS,
  type Trip,
} from "@/hooks/use-trips";
import { openDoc, downloadDoc } from "@/lib/doc-helpers";
import { BackButton } from "@/components/back-button";
import { useAuthStore } from "@/store/auth";
import { useConfirm } from "@/components/confirm-dialog";

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
  const t = useTranslations("trips");
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
              title={t("docView")}
              className="p-1 rounded hover:bg-muted"
            >
              <Eye className="h-3 w-3 text-muted-foreground" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadDoc(doc.id);
              }}
              title={t("docDownload")}
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
  const t = useTranslations("trips");
  const tStatus = useTranslations("common.tripStatus");
  const tActions = useTranslations("common.actions");
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: trips, isLoading } = useTrips();
  const user = useAuthStore((s) => s.user);
  const canDelete =
    user?.role === "ADMIN" ||
    user?.role === "TEAMLEAD" ||
    user?.role === "MANAGER";
  const confirm = useConfirm();
  const deleteTrip = useDeleteTrip();

  async function handleDelete(trip: Trip) {
    const ok = await confirm({
      title: t("deleteConfirm", { title: trip.title }),
      description: t("deleteConfirmDesc"),
      confirmText: tActions("delete"),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteTrip.mutateAsync(trip.id);
      toast.success(t("deleteSuccess"));
    } catch {
      toast.error(t("deleteError"));
    }
  }

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return trips ?? [];
    return (trips ?? []).filter((t) => {
      if ((t.orderNumber ?? "").toLowerCase().includes(q)) return true;
      if (t.title.toLowerCase().includes(q)) return true;
      if ((t.truck.plate ?? "").toLowerCase().includes(q)) return true;
      if ((fullName(t.driver) || "").toLowerCase().includes(q)) return true;
      if ((fullName(t.manager) || "").toLowerCase().includes(q)) return true;
      if (t.stops.some((s) => (s.address ?? "").toLowerCase().includes(q)))
        return true;
      // Dates: match the created date (ISO "2026-08-15" + the locale-formatted
      // form) and each stop's scheduled window date.
      if (t.createdAt.slice(0, 10).includes(q)) return true;
      if (
        new Date(t.createdAt)
          .toLocaleDateString(locale)
          .toLowerCase()
          .includes(q)
      )
        return true;
      if (t.stops.some((s) => (s.windowDate ?? "").includes(q))) return true;
      return false;
    });
  }, [trips, searchQuery, locale]);

  function toggle(tripId: string) {
    setExpandedId((prev) => (prev === tripId ? null : tripId));
  }

  return (
    <div className="flex flex-col p-4 gap-6">
      <div className="flex items-center gap-2">
        <BackButton />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="hidden sm:table-cell w-[100px]">
                {t("colOrder")}
              </TableHead>
              <TableHead className="w-[160px]">{t("colTrip")}</TableHead>
              <TableHead className="hidden md:table-cell w-[110px]">
                {t("colStatus")}
              </TableHead>
              <TableHead className="w-[90px]">{t("colTruck")}</TableHead>
              <TableHead className="hidden md:table-cell w-[130px]">
                {t("colDriver")}
              </TableHead>
              <TableHead className="hidden lg:table-cell w-[130px]">
                {t("colManager")}
              </TableHead>
              <TableHead className="hidden lg:table-cell">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {t("colAddresses")}
                </div>
              </TableHead>
              <TableHead className="w-[60px] text-center">
                <Paperclip className="h-3.5 w-3.5 mx-auto" />
              </TableHead>
              {canDelete && (
                <TableHead className="hidden sm:table-cell w-[48px]" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell className="hidden sm:table-cell">
                    <Skeleton className="h-4 w-4" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-6 w-24 rounded-md" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-16" />
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-28" />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Skeleton className="h-4 w-48" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-4 mx-auto" />
                  </TableCell>
                  {canDelete && (
                    <TableCell className="hidden sm:table-cell">
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canDelete ? COLS + 1 : COLS}
                  className="text-center py-12 text-muted-foreground"
                >
                  {searchQuery ? t("emptySearch") : t("empty")}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((trip) => {
                const isExpanded = expandedId === trip.id;
                const hasDocs = trip.documents.length > 0;
                const loadDate = tripLoadingDate(trip);
                return (
                  <Fragment key={trip.id}>
                    <TableRow
                      className="align-middle cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => toggle(trip.id)}
                    >
                      {/* Order # — hidden on phones (secondary + searchable) */}
                      <TableCell className="hidden sm:table-cell py-2 md:py-3">
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
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-medium text-xs md:text-sm leading-tight truncate max-w-[40vw] md:max-w-none">
                            {trip.title}
                          </span>
                          <span className="text-[11px] md:text-xs text-muted-foreground">
                            {loadDate
                              ? new Date(
                                  loadDate + "T00:00:00",
                                ).toLocaleDateString(locale)
                              : new Date(trip.createdAt).toLocaleDateString(
                                  locale,
                                )}
                          </span>
                        </div>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="hidden md:table-cell py-3">
                        <Badge
                          variant="outline"
                          className={TRIP_STATUS_COLORS[trip.status]}
                        >
                          {tStatus(trip.status)}
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
                          {fullName(trip.driver) || "—"}
                        </span>
                      </TableCell>

                      {/* Manager */}
                      <TableCell className="hidden lg:table-cell py-3">
                        <span className="text-sm">
                          {fullName(trip.manager) || "—"}
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

                      {/* Delete — ADMIN/TEAMLEAD only, tablet+ */}
                      {canDelete && (
                        <TableCell
                          className="hidden sm:table-cell py-2 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title={tActions("delete")}
                            onClick={() => handleDelete(trip)}
                            disabled={deleteTrip.isPending}
                          >
                            {deleteTrip.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>

                    {/* Expanded docs row */}
                    {isExpanded && hasDocs && (
                      <TableRow
                        key={`${trip.id}-docs`}
                        className="bg-blue-50/60 dark:bg-blue-950/20 border-l-2 border-l-blue-400/60"
                      >
                        <TableCell
                          colSpan={canDelete ? COLS + 1 : COLS}
                          className="py-0 px-4"
                        >
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
