"use client";

import { useMemo, useState } from "react";
import { fullName } from "@/lib/format";
import {
  Search,
  Folder,
  FolderOpen,
  Image as ImageIcon,
  FileText,
  Download,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAllDocuments, type TripDocumentFull } from "@/hooks/use-documents";
import { api } from "@/lib/api";

interface FolderGroup {
  tripId: string;
  tripTitle: string;
  orderNumber: string | null;
  truckPlate: string | null;
  docs: TripDocumentFull[];
  photos: number;
  documents: number;
  latest: number; // ms timestamp of most recent doc
}

export default function DocumentsPage() {
  const { data: docs = [], isLoading } = useAllDocuments();
  const [search, setSearch] = useState("");
  const [openFolder, setOpenFolder] = useState<FolderGroup | null>(null);

  const folders = useMemo<FolderGroup[]>(() => {
    const map = new Map<string, FolderGroup>();
    for (const d of docs) {
      const tripId = d.tripId;
      const t = new Date(d.createdAt).getTime();
      const existing = map.get(tripId);
      if (existing) {
        existing.docs.push(d);
        if (d.fileType === "PHOTO") existing.photos++;
        else existing.documents++;
        if (t > existing.latest) existing.latest = t;
      } else {
        map.set(tripId, {
          tripId,
          tripTitle: d.trip?.title ?? "Trip",
          orderNumber: d.trip?.orderNumber ?? null,
          truckPlate: d.trip?.truck?.plate ?? null,
          docs: [d],
          photos: d.fileType === "PHOTO" ? 1 : 0,
          documents: d.fileType === "DOCUMENT" ? 1 : 0,
          latest: t,
        });
      }
    }
    const list = Array.from(map.values()).sort((a, b) => b.latest - a.latest);
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (f) =>
        f.tripTitle.toLowerCase().includes(q) ||
        (f.orderNumber ?? "").toLowerCase().includes(q) ||
        (f.truckPlate ?? "").toLowerCase().includes(q),
    );
  }, [docs, search]);

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Badge variant="secondary">{docs.length} files</Badge>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by trip, order, plate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : folders.length === 0 ? (
        <div className="rounded-lg border py-16 text-center text-muted-foreground">
          No documents yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((f) => (
            <FolderCard key={f.tripId} folder={f} onClick={() => setOpenFolder(f)} />
          ))}
        </div>
      )}

      <FolderModal folder={openFolder} onClose={() => setOpenFolder(null)} />
    </div>
  );
}

// ─── Folder card ─────────────────────────────────────────────────────────────

function FolderCard({
  folder,
  onClick,
}: {
  folder: FolderGroup;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted">
        <Folder className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{folder.tripTitle}</div>
        <div className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
          {folder.orderNumber && <span>#{folder.orderNumber}</span>}
          {folder.truckPlate && <span>· {folder.truckPlate}</span>}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            {folder.photos}
          </span>
          <span className="inline-flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {folder.documents}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Folder modal with tabs ──────────────────────────────────────────────────

type Tab = "ALL" | "PHOTO" | "DOCUMENT";

function FolderModal({
  folder,
  onClose,
}: {
  folder: FolderGroup | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("ALL");
  const [lightbox, setLightbox] = useState<TripDocumentFull | null>(null);

  const filtered = useMemo(() => {
    if (!folder) return [];
    if (tab === "ALL") return folder.docs;
    return folder.docs.filter((d) => d.fileType === tab);
  }, [folder, tab]);

  const counts = {
    ALL: folder?.docs.length ?? 0,
    PHOTO: folder?.photos ?? 0,
    DOCUMENT: folder?.documents ?? 0,
  };

  const handleDownload = async (doc: TripDocumentFull) => {
    try {
      const res = await api.get(`/documents/${doc.id}/download`);
      window.open(res.data.url, "_blank");
    } catch {
      // swallow — user will see the request fail in network tab
    }
  };

  const handleDelete = async (doc: TripDocumentFull) => {
    if (!confirm(`Delete ${doc.fileName}?`)) return;
    await api.delete(`/documents/${doc.id}`);
    // Triggers a refetch via the hook's invalidation chain on next render
    window.location.reload();
  };

  return (
    <Sheet open={!!folder} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            {folder?.tripTitle ?? ""}
          </SheetTitle>
          <div className="text-xs text-muted-foreground font-mono">
            {folder?.orderNumber && <span>#{folder.orderNumber} </span>}
            {folder?.truckPlate && <span>· {folder.truckPlate}</span>}
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-3 grid grid-cols-3">
            <TabsTrigger value="ALL">All ({counts.ALL})</TabsTrigger>
            <TabsTrigger value="PHOTO">Photos ({counts.PHOTO})</TabsTrigger>
            <TabsTrigger value="DOCUMENT">Documents ({counts.DOCUMENT})</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="flex-1 overflow-y-auto px-4 py-3">
            {filtered.length === 0 ? (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Nothing here yet.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filtered.map((d) => (
                  <DocCard
                    key={d.id}
                    doc={d}
                    onOpen={() =>
                      d.fileType === "PHOTO" ? setLightbox(d) : handleDownload(d)
                    }
                    onDownload={() => handleDownload(d)}
                    onDelete={() => handleDelete(d)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

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
            <img
              src={lightbox.signedUrl}
              alt={lightbox.fileName}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Doc card ────────────────────────────────────────────────────────────────

function DocCard({
  doc,
  onOpen,
  onDownload,
  onDelete,
}: {
  doc: TripDocumentFull;
  onOpen: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const isPhoto = doc.fileType === "PHOTO";
  const created = new Date(doc.createdAt).toLocaleDateString();
  const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";

  return (
    <div className="rounded-lg border bg-card overflow-hidden flex flex-col">
      <button
        onClick={onOpen}
        className="aspect-video bg-muted overflow-hidden hover:opacity-90 transition-opacity"
      >
        {isPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.signedUrl}
            alt={doc.fileName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <FileText className="h-10 w-10" />
            <span className="text-xs font-mono">{ext}</span>
          </div>
        )}
      </button>
      <div className="flex items-start gap-2 p-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate" title={doc.fileName}>
            {doc.fileName}
          </div>
          <div className="text-xs text-muted-foreground">
            {created}
            {fullName(doc.uploader) ? ` · ${fullName(doc.uploader)}` : ""}
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDownload}>
          <Download className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
