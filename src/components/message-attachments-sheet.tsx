"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, FileText, Eye, Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { openUrlInViewer } from "@/lib/doc-helpers";
import { useAuthStore } from "@/store/auth";
import {
  useConversationDocuments,
  useUploadConversationDocs,
  useDeleteConversationDoc,
  useConversationDocsSocketSync,
  type ConversationDocumentFull,
} from "@/hooks/use-conversation-documents";
import {
  useGroupDocuments,
  useUploadGroupDocs,
  useDeleteGroupDoc,
  useGroupDocsSocketSync,
  type GroupDocumentFull,
} from "@/hooks/use-group-documents";

type Source = "dm" | "group";

type AnyDoc = ConversationDocumentFull | GroupDocumentFull;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  source: Source;
  targetId: string;
  title: string;
}

export function MessageAttachmentsSheet({
  open,
  onOpenChange,
  source,
  targetId,
  title,
}: Props) {
  const t = useTranslations("chat.attachments");
  const tActions = useTranslations("common.actions");
  const confirm = useConfirm();
  const user = useAuthStore((s) => s.user);
  const isDm = source === "dm";

  // Always call both hooks — keeps hook order stable. Only the one matching
  // `source` will actually fetch (the other gets enabled=false via empty id).
  const dmQuery = useConversationDocuments(isDm ? targetId : "");
  const groupQuery = useGroupDocuments(!isDm ? targetId : "");
  const dmUpload = useUploadConversationDocs(isDm ? targetId : "");
  const groupUpload = useUploadGroupDocs(!isDm ? targetId : "");
  const dmDelete = useDeleteConversationDoc(isDm ? targetId : "");
  const groupDelete = useDeleteGroupDoc(!isDm ? targetId : "");

  // Real-time sync — only the relevant one runs.
  useConversationDocsSocketSync(isDm ? targetId : null);
  useGroupDocsSocketSync(!isDm ? targetId : null);

  const docs: AnyDoc[] = isDm ? (dmQuery.data ?? []) : (groupQuery.data ?? []);
  const isLoading = isDm ? dmQuery.isLoading : groupQuery.isLoading;

  const photos = docs.filter((d) => d.fileType === "PHOTO");
  const documents = docs.filter((d) => d.fileType === "DOCUMENT");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      if (isDm) await dmUpload.mutateAsync({ files });
      else await groupUpload.mutateAsync({ files });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function openDoc(id: string, fileName?: string) {
    const path = isDm
      ? `/direct-messages/documents/${id}/view`
      : `/group-messages/documents/${id}/view`;
    const res = await api.get<{ url: string }>(path);
    await openUrlInViewer(res.data.url, fileName);
  }

  async function downloadDoc(id: string) {
    const path = isDm
      ? `/direct-messages/documents/${id}/download`
      : `/group-messages/documents/${id}/download`;
    const res = await api.get<{ url: string }>(path);
    window.open(res.data.url, "_blank");
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: t("deleteConfirm"),
      confirmText: tActions("delete"),
      destructive: true,
    });
    if (!ok) return;
    if (isDm) await dmDelete.mutateAsync(id);
    else await groupDelete.mutateAsync(id);
  }

  const renderRow = (doc: AnyDoc) => {
    const isPhoto = doc.fileType === "PHOTO";
    const canDelete = doc.uploadedBy === user?.id;
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
              onClick={() => handleDelete(doc.id)}
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <SheetTitle className="truncate">{title}</SheetTitle>
          <p className="text-xs text-muted-foreground">
            {isDm ? t("dmSubtitle") : t("groupSubtitle")}
          </p>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <div className="flex flex-col gap-3">
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

            {isLoading ? (
              <div className="py-6 flex justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : docs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                {t("noAttachments")}
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
                <TabsContent
                  value="PHOTO"
                  className="flex flex-col gap-1.5 mt-0"
                >
                  {photos.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">
                      {t("noPhotos")}
                    </p>
                  ) : (
                    photos.map(renderRow)
                  )}
                </TabsContent>
                <TabsContent
                  value="DOCUMENT"
                  className="flex flex-col gap-1.5 mt-0"
                >
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
