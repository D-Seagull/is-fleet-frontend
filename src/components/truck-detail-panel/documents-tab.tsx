"use client";

import { useState, useRef } from "react";
import {
  X,
  Download,
  Loader2,
  Plus,
  FolderOpen,
  FileText,
  Eye,
  Trash2,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
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
import { shortenTripTitle } from "./utils";

export function DocumentsTab({ truckId }: { truckId: string }) {
  const t = useTranslations("truckPanel.documents");
  const tActions = useTranslations("common.actions");
  const { data: trips = [] } = useTripsByTruck(truckId);
  const [tripFilter, setTripFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [uploadTripId, setUploadTripId] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<{
    id: string;
    signedUrl: string;
  } | null>(null);

  const { data: docs = [], isLoading } = useDocumentsByTruck(truckId);
  const upload = useUploadDocuments(truckId);
  const deleteDoc = useDeleteDocument(truckId);

  const q = search.trim().toLowerCase();
  const filtered = docs.filter((d) => {
    if (tripFilter !== "all" && d.tripId !== tripFilter) return false;
    if (!q) return true;
    // Search by date (localized + ISO), order number and file name.
    const dateStr = `${new Date(d.createdAt).toLocaleDateString()} ${d.createdAt.slice(0, 10)}`.toLowerCase();
    const order = (d.trip?.orderNumber ?? "").toLowerCase();
    return (
      dateStr.includes(q) ||
      order.includes(q) ||
      d.fileName.toLowerCase().includes(q)
    );
  });

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
      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox.signedUrl}
            alt="preview"
            className="max-w-full max-h-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-4">
            <button
              className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-white text-sm transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                downloadDoc(lightbox.id);
              }}
            >
              <Download className="h-4 w-4" /> {tActions("download")}
            </button>
          </div>
        </div>
      )}

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
                          src={doc.signedUrl}
                          alt={doc.fileName}
                          className="h-9 w-9 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() =>
                            setLightbox({
                              id: doc.id,
                              signedUrl: doc.signedUrl,
                            })
                          }
                        />
                      ) : (
                        <div className="h-9 w-9 flex items-center justify-center rounded bg-muted">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-2 py-1.5 max-w-[120px]">
                      <button
                        onClick={() => openDoc(doc.id)}
                        className="truncate block w-full text-left hover:underline font-medium"
                        title={doc.fileName}
                      >
                        {doc.fileName}
                      </button>
                    </TableCell>
                    <TableCell className="px-2 py-1.5 text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {new Date(doc.createdAt).toLocaleDateString()}
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
                          onClick={() => openDoc(doc.id)}
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
