"use client";

import { useState, useRef } from "react";
import {
  Download,
  Loader2,
  Plus,
  FolderOpen,
  FileText,
  Eye,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fullName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { openDoc, downloadDoc } from "@/lib/doc-helpers";
import {
  useDocumentsByTruck,
  useUploadDocuments,
  useDeleteDocument,
} from "@/hooks/use-documents";
import { useTripsByTruck } from "@/hooks/use-trips";
import { PhotoGallery } from "@/components/photo-gallery";
import { useConfirm } from "@/components/confirm-dialog";
import { cn } from "@/lib/utils";
import { ACTIVE_STATUSES } from "./constants";
import { shortenTripTitle } from "./utils";

export function DocumentsTab({ truckId }: { truckId: string }) {
  const t = useTranslations("truckPanel.documents");
  const tActions = useTranslations("common.actions");
  const locale = useLocale();
  const { data: trips = [] } = useTripsByTruck(truckId);
  // One field does both: focused while empty it lists the truck's trips —
  // picking one filters to it (shown as a chip) — and typed text searches by
  // date / order # / file name.
  const [tripFilter, setTripFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tripListOpen, setTripListOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  // Index into `galleryPhotos` of the photo open in the gallery, or null.
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const { data: docs = [], isLoading } = useDocumentsByTruck(truckId);
  const upload = useUploadDocuments(truckId);
  const deleteDoc = useDeleteDocument(truckId);
  const confirm = useConfirm();

  async function handleDeleteDoc(id: string) {
    const ok = await confirm({
      title: t("deleteConfirm"),
      description: t("deleteConfirmDesc"),
      confirmText: tActions("delete"),
      destructive: true,
    });
    if (!ok) return;
    deleteDoc.mutate(id);
  }

  const q = search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    // Deleted files (incl. ones gone from storage — the backend marks those
    // deleted and sends signedUrl "") can't be viewed or downloaded.
    if (d.deletedAt || !d.signedUrl) return false;
    if (tripFilter && d.tripId !== tripFilter) return false;
    if (!q) return true;
    // Search by date (localized + ISO), order number and file name.
    const dateStr =
      `${new Date(d.createdAt).toLocaleDateString(locale)} ${d.createdAt.slice(0, 10)}`.toLowerCase();
    const order = (d.trip?.orderNumber ?? "").toLowerCase();
    return (
      dateStr.includes(q) ||
      order.includes(q) ||
      d.fileName.toLowerCase().includes(q)
    );
  });

  // The gallery flips through the photos currently listed — trip filter and
  // search applied, same order as the table.
  const galleryPhotos = filtered.filter((d) => d.fileType === "PHOTO");

  // Photos open in the gallery (thumbnail, name or 👁), other files in the
  // viewer / new tab.
  const openRow = (doc: (typeof filtered)[number]) => {
    const i = galleryPhotos.findIndex((p) => p.id === doc.id);
    if (i >= 0) setGalleryIndex(i);
    else openDoc(doc.id, doc.fileName);
  };

  // Live files per trip, for the counts in the trip list.
  const liveCount = (tripId: string) =>
    docs.filter((d) => d.tripId === tripId && !d.deletedAt && d.signedUrl)
      .length;
  const selectedTrip = trips.find((tr) => tr.id === tripFilter) ?? null;
  const tripLabel = (tr: (typeof trips)[number]) =>
    `${shortenTripTitle(tr.title)}${tr.orderNumber ? ` · #${tr.orderNumber}` : ""}`;

  // "+" uploads to the trip picked in the field; with none picked, to the
  // truck's only active trip. Otherwise it opens the list to choose one.
  const activeTrips = trips.filter((tr) => ACTIVE_STATUSES.includes(tr.status));
  const uploadTrip =
    selectedTrip ?? (activeTrips.length === 1 ? activeTrips[0] : null);

  function pickTrip(id: string | null) {
    setTripFilter(id);
    setTripListOpen(false);
  }

  function onAddClick() {
    if (uploadTrip) {
      fileInputRef.current?.click();
    } else {
      searchRef.current?.focus();
      setTripListOpen(true);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const uploadTripId = uploadTrip?.id;
    if (!files.length || !uploadTripId) return;
    setUploading(true);
    try {
      await upload.mutateAsync({ tripId: uploadTripId, files });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <PhotoGallery
        photos={galleryPhotos}
        startIndex={galleryIndex}
        onClose={() => setGalleryIndex(null)}
        onDownload={(photo) => downloadDoc(photo.id)}
      />

      {/* Search + trip picker in one field, upload next to it */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 min-w-0">
          <div
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md border bg-transparent px-2.5 text-xs shadow-xs dark:bg-input/30",
              "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
            )}
            onClick={() => searchRef.current?.focus()}
          >
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            {selectedTrip && (
              <span className="flex max-w-[60%] shrink-0 items-center gap-1 rounded bg-muted px-1.5 py-0.5">
                <span className="truncate">{tripLabel(selectedTrip)}</span>
                <button
                  type="button"
                  aria-label={t("clearTrip")}
                  onClick={(e) => {
                    e.stopPropagation();
                    pickTrip(null);
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <input
              ref={searchRef}
              value={search}
              placeholder={selectedTrip ? "" : t("searchPlaceholder")}
              onChange={(e) => {
                setSearch(e.target.value);
                setTripListOpen(e.target.value === "");
              }}
              onFocus={() => setTripListOpen(search === "")}
              onBlur={() => setTripListOpen(false)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setTripListOpen(false);
                if (e.key === "Backspace" && !search && selectedTrip) {
                  pickTrip(null);
                }
              }}
              className="h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Trip list: shown on focus until something is typed */}
          {tripListOpen && trips.length > 0 && (
            <div
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
              // Keep focus in the field, so the click lands before blur.
              onMouseDown={(e) => e.preventDefault()}
            >
              <button
                type="button"
                onClick={() => pickTrip(null)}
                className={cn(
                  "flex w-full items-center rounded px-2 py-1.5 text-left text-xs hover:bg-accent",
                  !tripFilter && "font-medium",
                )}
              >
                {t("allTrips", {
                  count: docs.filter((d) => !d.deletedAt && d.signedUrl).length,
                })}
              </button>
              {trips.map((tr) => (
                <button
                  key={tr.id}
                  type="button"
                  onClick={() => pickTrip(tr.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-accent",
                    tr.id === tripFilter && "bg-accent font-medium",
                  )}
                >
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      ACTIVE_STATUSES.includes(tr.status)
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/40",
                    )}
                  />
                  <span className="flex-1 truncate">{tripLabel(tr)}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {liveCount(tr.id)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button
          size="sm"
          className="h-8 shrink-0 px-3"
          disabled={uploading || trips.length === 0}
          title={
            uploadTrip
              ? t("uploadTo", { trip: tripLabel(uploadTrip) })
              : t("uploadPickTrip")
          }
          onClick={onAddClick}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <FolderOpen className="h-8 w-8 opacity-30" />
          <p className="text-sm">{t("noAttachments")}</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-[11px]">
                <TableHead className="w-12 px-2 py-2" />
                <TableHead className="px-2 py-2">{t("colFile")}</TableHead>
                <TableHead className="px-2 py-2 hidden sm:table-cell w-24">
                  {t("colDate")}
                </TableHead>
                <TableHead className="px-2 py-2 hidden sm:table-cell w-24">
                  {t("colOrder")}
                </TableHead>
                <TableHead className="px-2 py-2 hidden md:table-cell">
                  {t("colDriver")}
                </TableHead>
                <TableHead className="px-2 py-2 w-20 text-right">
                  {t("colActions")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((doc) => {
                const isPhoto = doc.fileType === "PHOTO";
                return (
                  <TableRow key={doc.id} className="text-xs">
                    <TableCell className="px-2 py-1.5 w-12">
                      {isPhoto ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={doc.thumbUrl || doc.signedUrl}
                          alt={doc.fileName}
                          className="h-9 w-9 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openRow(doc)}
                        />
                      ) : (
                        <div className="h-9 w-9 flex items-center justify-center rounded bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 max-w-[120px]">
                      <button
                        onClick={() => openRow(doc)}
                        className="truncate block w-full text-left hover:underline font-medium"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </button>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString(locale)}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell font-mono">
                      {doc.trip?.orderNumber ? `#${doc.trip.orderNumber}` : "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-muted-foreground hidden md:table-cell">
                      {fullName(doc.uploader) || "—"}
                    </TableCell>
                    <TableCell className="px-2 py-1.5">
                      <div className="flex items-center gap-0.5 justify-end">
                        <button
                          onClick={() => openRow(doc)}
                          title={tActions("view")}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => downloadDoc(doc.id)}
                          title={tActions("download")}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          title={tActions("delete")}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
