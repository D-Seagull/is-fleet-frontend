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
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fullName } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { shortenTripTitle } from "./utils";

export function DocumentsTab({ truckId }: { truckId: string }) {
  const t = useTranslations("truckPanel.documents");
  const tActions = useTranslations("common.actions");
  const locale = useLocale();
  const { data: trips = [] } = useTripsByTruck(truckId);
  const [tripFilter, setTripFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [uploadTripId, setUploadTripId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Index into `galleryPhotos` of the photo open in the gallery, or null.
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const { data: docs = [], isLoading } = useDocumentsByTruck(truckId);
  const upload = useUploadDocuments(truckId);
  const deleteDoc = useDeleteDocument(truckId);

  const q = search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    // Deleted files (incl. ones gone from storage — the backend marks those
    // deleted and sends signedUrl "") can't be viewed or downloaded.
    if (d.deletedAt || !d.signedUrl) return false;
    if (tripFilter !== "all" && d.tripId !== tripFilter) return false;
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

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
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

      {/* Search by date / order # / file name */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
      </div>

      {/* Upload row */}
      <div className="flex items-center gap-2">
        <Select value={tripFilter} onValueChange={setTripFilter}>
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              {t("allTrips", { count: docs.length })}
            </SelectItem>
            {trips.map((trip) => {
              const count = docs.filter((d) => d.tripId === trip.id).length;
              return (
                <SelectItem key={trip.id} value={trip.id}>
                  {shortenTripTitle(trip.title)}
                  {trip.orderNumber && ` · #${trip.orderNumber}`}
                  {count > 0 && ` (${count})`}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select value={uploadTripId} onValueChange={setUploadTripId}>
          <SelectTrigger className="h-8 text-xs w-[130px] shrink-0">
            <SelectValue placeholder={t("tripPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {trips.map((trip) => (
              <SelectItem key={trip.id} value={trip.id}>
                {trip.orderNumber
                  ? `#${trip.orderNumber}`
                  : shortenTripTitle(trip.title)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 shrink-0 px-3"
          disabled={!uploadTripId || uploading}
          onClick={() => fileInputRef.current?.click()}
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
                          onClick={() => deleteDoc.mutate(doc.id)}
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
