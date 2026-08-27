"use client";

import { useRef, useState } from "react";
import {
  Loader2,
  FileText,
  Eye,
  Download,
  Trash2,
  Plus,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { openDoc, downloadDoc } from "@/lib/doc-helpers";
import {
  useDocumentsByTrip,
  useDeleteDocument,
  useUploadDocuments,
  type TripDocumentFull,
} from "@/hooks/use-documents";

export function TripAttachmentsContent({
  tripId,
  truckId,
  canDelete = false,
  canUpload = false,
}: {
  tripId: string;
  truckId: string;
  canDelete?: boolean;
  canUpload?: boolean;
}) {
  const t = useTranslations("truckPanel.documents");
  const tActions = useTranslations("common.actions");
  const { data: docs = [], isLoading } = useDocumentsByTrip(tripId);
  const deleteDoc = useDeleteDocument(truckId);
  const upload = useUploadDocuments(truckId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const photos = docs.filter((d) => d.fileType === "PHOTO");
  const documents = docs.filter((d) => d.fileType === "DOCUMENT");

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      await upload.mutateAsync({ tripId, files });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (isLoading)
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );

  const renderRow = (doc: TripDocumentFull) => {
    const isPhoto = doc.fileType === "PHOTO";
    return (
      <div
        key={doc.id}
        className="flex items-center gap-2 p-1 rounded hover:bg-muted/50"
      >
        {isPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={doc.signedUrl}
            alt={doc.fileName}
            className="h-10 w-10 object-cover rounded shrink-0 cursor-pointer"
            onClick={() => openDoc(doc.id, doc.fileName)}
          />
        ) : (
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <button
          onClick={() => openDoc(doc.id, doc.fileName)}
          className="text-xs truncate flex-1 text-left hover:underline"
        >
          {doc.fileName}
        </button>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => openDoc(doc.id, doc.fileName)}
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
          {canDelete && (
            <button
              onClick={() => deleteDoc.mutate(doc.id)}
              title={tActions("delete")}
              className="p-1 rounded hover:bg-muted"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {canUpload && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-7 text-xs gap-1"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
            {t("upload")}
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
      )}
      {docs.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">
          {t("noAttachments")}.
        </p>
      ) : (
        <Tabs defaultValue="ALL">
          <TabsList className="grid grid-cols-3 mb-2">
            <TabsTrigger value="ALL" className="text-xs">
              {t("tabAll", { count: docs.length })}
            </TabsTrigger>
            <TabsTrigger value="PHOTO" className="text-xs">
              {t("tabPhotos", { count: photos.length })}
            </TabsTrigger>
            <TabsTrigger value="DOCUMENT" className="text-xs">
              {t("tabDocuments", { count: documents.length })}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="ALL" className="flex flex-col gap-1.5 mt-0">
            {docs.map(renderRow)}
          </TabsContent>
          <TabsContent value="PHOTO" className="flex flex-col gap-1.5 mt-0">
            {photos.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {t("noPhotos")}
              </p>
            ) : (
              photos.map(renderRow)
            )}
          </TabsContent>
          <TabsContent value="DOCUMENT" className="flex flex-col gap-1.5 mt-0">
            {documents.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {t("noDocuments")}
              </p>
            ) : (
              documents.map(renderRow)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
