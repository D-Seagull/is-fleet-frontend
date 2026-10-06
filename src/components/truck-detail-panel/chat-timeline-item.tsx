"use client";

import { FileText, Download } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { EDIT_WINDOW_MS } from "@/lib/constants";
import { openDoc, downloadDoc } from "@/lib/doc-helpers";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageReactionsCluster } from "@/components/message-reactions";
import { MessageActionsContext } from "@/components/message-actions-menu";
import { MessageQuote } from "@/components/message-quote";
import { systemMessageText } from "@/lib/system-message";
import { AlbumGrid } from "@/components/album-grid";
import { UploadingTick, UploadProgress } from "@/components/upload-progress";
import { isPending, stableKey, uploadProgress } from "@/lib/outbox";
import type { TripMessage } from "@/hooks/use-trips";
import type { TripDocumentFull } from "@/hooks/use-documents";
import type { ReplyTarget } from "./chat-composer";

export type TimelineItem =
  | { kind: "msg"; data: TripMessage }
  | { kind: "file"; data: TripDocumentFull }
  // Files sent in one message — `data` is the first one (timeline position,
  // reactions, replies, ✓✓), `docs` the whole album oldest first.
  | { kind: "album"; data: TripDocumentFull; docs: TripDocumentFull[] };

interface CommonProps {
  currentUserId: string;
  setReplyingTo: (v: ReplyTarget | null) => void;
  scrollToTripMessage: (id: string) => void;
  scrollToTripDoc: (id: string) => void;
  onOpenUser: (userId: string) => void;
  /** Label of a quoted file — "Album · N files" when it belongs to one. */
  docLabel: (doc: { fileName: string; batchId?: string | null }) => string;
}

interface MessageBubbleProps extends CommonProps {
  msg: TripMessage;
  onEdit: (id: string, original: string) => void;
  onDelete: (id: string) => void;
}

function MessageBubble({
  msg,
  currentUserId,
  setReplyingTo,
  scrollToTripMessage,
  scrollToTripDoc,
  onEdit,
  onDelete,
  onOpenUser,
  docLabel,
}: MessageBubbleProps) {
  const t = useTranslations("chat");
  const locale = useLocale();

  // System messages render as a centred grey label (Telegram-style
  // "user X joined" notices).
  if (msg.isSystem) {
    return (
      <div className="self-center text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
        {systemMessageText(msg.content, t)}
      </div>
    );
  }

  const isMine = msg.senderId === currentUserId;
  const isDeleted = !!msg.deletedAt;
  const senderInitials = (fullName(msg.sender) || "??")
    .slice(0, 2)
    .toUpperCase();
  const canEdit =
    isMine &&
    !isDeleted &&
    !msg.isSystem &&
    // eslint-disable-next-line react-hooks/purity -- 24-hour edit window must be evaluated against the current time on each render
    Date.now() - new Date(msg.createdAt).getTime() < EDIT_WINDOW_MS;
  const actions = {
    onCopy: () => navigator.clipboard.writeText(msg.content),
    onReply: () =>
      setReplyingTo({
        id: msg.id,
        targetType: "msg",
        senderName: fullName(msg.sender) || null,
        content: msg.content,
        isDeleted: !!msg.deletedAt,
      }),
    onEdit: canEdit ? () => onEdit(msg.id, msg.content) : undefined,
    onDelete: isMine ? () => onDelete(msg.id) : undefined,
  };

  return (
    <div
      className={cn(
        // Full-width row: the bubble column's max-w is then a share of the
        // chat width, not of its own content (which squeezed bubbles).
        "group flex w-full items-center gap-2",
        isMine && "justify-end",
      )}
    >
      {/* Sidekick — Trigger (mine / idle) + others inline. */}
      {isMine && !isDeleted && (
        <MessageReactionsCluster
          messageId={msg.id}
          type="TRIP"
          reactions={msg.reactions ?? []}
          currentUserId={currentUserId}
        />
      )}
      {!isMine && (
        <button
          type="button"
          onClick={() => onOpenUser(msg.senderId)}
          className="shrink-0"
          title={t("messageUser", {
            name: fullName(msg.sender) || t("userFallback"),
          })}
        >
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={msg.sender?.avatar ?? undefined}
              alt={fullName(msg.sender) || ""}
            />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {senderInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      )}
      <div
        className={cn(
          "flex flex-col gap-0.5 max-w-[70%] min-w-0",
          isMine && "items-end",
        )}
      >
        {!isMine && (
          <button
            type="button"
            onClick={() => onOpenUser(msg.senderId)}
            className="text-xs text-muted-foreground px-1 hover:underline cursor-pointer text-left"
          >
            {fullName(msg.sender) || t("unknown")}
          </button>
        )}
        <MessageActionsContext
          actions={actions}
          isOwn={isMine}
          isDeleted={isDeleted}
        >
          <div
            id={`trip-msg-${msg.id}`}
            className={cn(
              "rounded-2xl max-w-full transition-shadow",
              isDeleted
                ? "bg-muted/40 text-muted-foreground italic text-xs px-3 py-1 whitespace-nowrap"
                : cn(
                    "px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  ),
            )}
          >
            {!isDeleted && msg.replyTo && (
              <MessageQuote
                senderName={fullName(msg.replyTo.sender)}
                content={msg.replyTo.content}
                isDeleted={!!msg.replyTo.deletedAt}
                onClick={() => scrollToTripMessage(msg.replyTo!.id)}
                variant={isMine ? "onPrimary" : "default"}
              />
            )}
            {!isDeleted && msg.replyToDocument && (
              <MessageQuote
                kind="doc"
                senderName={fullName(msg.replyToDocument.uploader)}
                fileName={docLabel(msg.replyToDocument)}
                content=""
                isDeleted={!!msg.replyToDocument.deletedAt}
                onClick={() => scrollToTripDoc(msg.replyToDocument!.id)}
                variant={isMine ? "onPrimary" : "default"}
              />
            )}
            {isDeleted
              ? t("messageDeleted")
              : msg.content}
          </div>
        </MessageActionsContext>
        <span className="text-[10px] text-muted-foreground/60 px-1 flex items-center gap-1">
          {msg.editedAt && !isDeleted && (
            <span
              title={t("editedAtTitle", {
                time: new Date(msg.editedAt).toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
              className="italic"
            >
              {t("editedMark")}
            </span>
          )}
          {new Date(msg.createdAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isMine && !isDeleted && (
            <span className={cn(msg.isRead && "text-primary")}>
              {msg.isRead ? "✓✓" : "✓"}
            </span>
          )}
        </span>
      </div>
      {/* Sidekick (other side). */}
      {!isMine && !isDeleted && (
        <MessageReactionsCluster
          messageId={msg.id}
          type="TRIP"
          reactions={msg.reactions ?? []}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}

const isPhotoDoc = (doc: { fileType: string; fileName: string }) =>
  doc.fileType === "PHOTO" ||
  /\.(jpe?g|png|gif|webp|heic|avif)$/i.test(doc.fileName);

/** One non-photo file: icon, name, extension, download. Opens on click. */
function FileRow({
  doc,
  isMine,
  anchorId,
}: {
  doc: TripDocumentFull;
  isMine: boolean;
  anchorId?: string;
}) {
  const tActions = useTranslations("common.actions");
  const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
  return (
    <div
      id={anchorId}
      role="button"
      tabIndex={0}
      onClick={() => openDoc(doc.id, doc.fileName)}
      onKeyDown={(e) => e.key === "Enter" && openDoc(doc.id, doc.fileName)}
      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:opacity-80 transition-opacity"
    >
      <FileText className="h-5 w-5 shrink-0" />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm truncate max-w-[180px] leading-tight">
          {doc.fileName}
        </span>
        <span
          className={cn(
            "text-[10px] leading-tight",
            isMine ? "text-primary-foreground/70" : "text-muted-foreground",
          )}
        >
          {ext}
        </span>
      </div>
      <button
        title={tActions("download")}
        onClick={(e) => {
          e.stopPropagation();
          downloadDoc(doc.id);
        }}
        className="shrink-0 opacity-70 hover:opacity-100"
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface FileBubbleProps extends CommonProps {
  doc: TripDocumentFull;
  onDelete: (id: string) => void;
  onImageClick: (id: string, signedUrl: string) => void;
  onImageLoaded: () => void;
}

function FileBubble({
  doc,
  currentUserId,
  setReplyingTo,
  scrollToTripMessage,
  scrollToTripDoc,
  onDelete,
  onImageClick,
  onImageLoaded,
  docLabel,
}: FileBubbleProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const isMine = doc.uploadedBy === currentUserId;
  const isDeletedDoc = !!doc.deletedAt;
  const isPhoto = isPhotoDoc(doc);
  // Still uploading (lib/outbox): no menu / reactions / gallery until stored.
  const pending = isPending(doc);
  const docActions = {
    onCopy: () => navigator.clipboard.writeText(doc.fileName),
    onReply: () =>
      setReplyingTo({
        id: doc.id,
        targetType: "doc",
        senderName: fullName(doc.uploader) || null,
        content: doc.fileName,
        isDeleted: isDeletedDoc,
      }),
    onDelete: isMine ? () => onDelete(doc.id) : undefined,
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3",
        // Own: trigger on the LEFT, bubble on the right.
        // Other: bubble on the left, trigger on the RIGHT (reverse).
        isMine ? "self-end" : "self-start flex-row-reverse",
        pending && "pointer-events-none",
      )}
    >
      {/* Doc sidekick — cluster style. flex-row-reverse on `other` keeps
          the cluster on the visual right. */}
      {!isDeletedDoc && (
        <MessageReactionsCluster
          messageId={doc.id}
          type="TRIP_DOC"
          reactions={doc.reactions ?? []}
          currentUserId={currentUserId}
        />
      )}
      <div
        className={cn(
          // w-fit so the bubble shrinks to its content (e.g. a 180px
          // photo) instead of stretching to the 80% max-w container.
          "flex flex-col gap-0.5 max-w-[80%] w-fit min-w-0",
          isMine && "items-end",
        )}
      >
        <span className="text-xs text-muted-foreground px-1">
          {fullName(doc.uploader) || t("unknown")}
        </span>
        <MessageActionsContext
          actions={docActions}
          isOwn={isMine}
          isDeleted={isDeletedDoc}
        >
          <div id={`trip-doc-${doc.id}`} className="transition-shadow">
            {!isDeletedDoc && doc.replyTo && (
              <MessageQuote
                senderName={fullName(doc.replyTo.sender)}
                content={doc.replyTo.content}
                isDeleted={!!doc.replyTo.deletedAt}
                onClick={() => scrollToTripMessage(doc.replyTo!.id)}
                variant="default"
              />
            )}
            {!isDeletedDoc && doc.replyToDocument && (
              <MessageQuote
                kind="doc"
                senderName={fullName(doc.replyToDocument.uploader)}
                fileName={docLabel(doc.replyToDocument)}
                content=""
                isDeleted={!!doc.replyToDocument.deletedAt}
                onClick={() => scrollToTripDoc(doc.replyToDocument!.id)}
                variant="default"
              />
            )}
            {isDeletedDoc ? (
              <div className="rounded-2xl bg-muted/40 text-muted-foreground italic px-3 py-1 text-xs whitespace-nowrap">
                {t("fileDeleted")}
              </div>
            ) : isPhoto ? (
              <div
                className={cn(
                  "rounded-2xl overflow-hidden border max-w-[200px]",
                  doc.caption &&
                    (isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"),
                )}
              >
                <div
                  className="relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick(doc.id, doc.signedUrl)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doc.thumbUrl || doc.signedUrl}
                    alt={doc.fileName}
                    onLoad={onImageLoaded}
                    className="max-w-[200px] max-h-[200px] w-full object-cover block"
                  />
                  <UploadProgress progress={uploadProgress(doc)} />
                </div>
                {doc.caption && (
                  <p className="text-sm whitespace-pre-wrap break-words px-3 py-2">
                    {doc.caption}
                  </p>
                )}
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-2xl border overflow-hidden",
                  isMine
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted",
                )}
              >
                <FileRow doc={doc} isMine={isMine} />
                {doc.caption && (
                  <p className="text-sm whitespace-pre-wrap break-words px-3 pb-2">
                    {doc.caption}
                  </p>
                )}
              </div>
            )}
          </div>
        </MessageActionsContext>
        <span className="text-[10px] text-muted-foreground/60 px-1 flex items-center gap-1">
          {new Date(doc.createdAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isMine && !isDeletedDoc && pending && <UploadingTick />}
          {isMine && !isDeletedDoc && !pending && (
            <span className={cn(doc.isRead && "text-primary")}>
              {doc.isRead ? "✓✓" : "✓"}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

interface AlbumBubbleProps extends CommonProps {
  docs: TripDocumentFull[];
  onDeleteAlbum: (id: string) => void;
  onImageClick: (id: string, signedUrl: string) => void;
  onImageLoaded: () => void;
}

/**
 * Several files sent in one message: photo grid (+N), the other files under
 * it, the caption once. Reply / react / ✓✓ belong to the first file; delete
 * removes the whole album.
 */
function AlbumBubble({
  docs,
  currentUserId,
  setReplyingTo,
  scrollToTripMessage,
  scrollToTripDoc,
  onDeleteAlbum,
  onImageClick,
  onImageLoaded,
  docLabel,
}: AlbumBubbleProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const lead = docs[0];
  const isMine = lead.uploadedBy === currentUserId;
  // Files can also be deleted one by one from the Documents tab.
  const live = docs.filter((d) => !d.deletedAt && d.signedUrl);
  const isDeleted = live.length === 0;
  const photos = live.filter(isPhotoDoc);
  const files = live.filter((d) => !isPhotoDoc(d));
  const caption = lead.caption;
  const label = docLabel(lead);
  const pending = isPending(lead);
  // The bubble itself carries the first file's anchor; the rest get their
  // own so a reply quoting any file of the album scrolls to it.
  const anchor = (id: string) =>
    id === lead.id ? undefined : `trip-doc-${id}`;

  const actions = {
    onCopy: () => navigator.clipboard.writeText(caption || label),
    onReply: () =>
      setReplyingTo({
        id: lead.id,
        targetType: "doc",
        senderName: fullName(lead.uploader) || null,
        content: label,
        isDeleted,
      }),
    onDelete: isMine ? () => onDeleteAlbum(lead.id) : undefined,
  };

  return (
    <div
      className={cn(
        "group flex items-center gap-3",
        isMine ? "self-end" : "self-start flex-row-reverse",
        pending && "pointer-events-none",
      )}
    >
      {!isDeleted && (
        <MessageReactionsCluster
          messageId={lead.id}
          type="TRIP_DOC"
          reactions={lead.reactions ?? []}
          currentUserId={currentUserId}
        />
      )}
      <div
        className={cn(
          "flex flex-col gap-0.5 max-w-[80%] w-fit min-w-0",
          isMine && "items-end",
        )}
      >
        <span className="text-xs text-muted-foreground px-1">
          {fullName(lead.uploader) || t("unknown")}
        </span>
        <MessageActionsContext
          actions={actions}
          isOwn={isMine}
          isDeleted={isDeleted}
        >
          <div id={`trip-doc-${lead.id}`} className="transition-shadow">
            {!isDeleted && lead.replyTo && (
              <MessageQuote
                senderName={fullName(lead.replyTo.sender)}
                content={lead.replyTo.content}
                isDeleted={!!lead.replyTo.deletedAt}
                onClick={() => scrollToTripMessage(lead.replyTo!.id)}
                variant="default"
              />
            )}
            {!isDeleted && lead.replyToDocument && (
              <MessageQuote
                kind="doc"
                senderName={fullName(lead.replyToDocument.uploader)}
                fileName={docLabel(lead.replyToDocument)}
                content=""
                isDeleted={!!lead.replyToDocument.deletedAt}
                onClick={() => scrollToTripDoc(lead.replyToDocument!.id)}
                variant="default"
              />
            )}
            {isDeleted ? (
              <div className="rounded-2xl bg-muted/40 text-muted-foreground italic px-3 py-1 text-xs whitespace-nowrap">
                {t("fileDeleted")}
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-2xl overflow-hidden border w-fit max-w-[260px]",
                  (caption || files.length > 0) &&
                    (isMine
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"),
                )}
              >
                <AlbumGrid
                  photos={photos}
                  onOpen={(id) => {
                    const p = photos.find((x) => x.id === id);
                    if (p) onImageClick(p.id, p.signedUrl);
                  }}
                  onImageLoaded={onImageLoaded}
                  anchorId={anchor}
                />
                {files.map((d) => (
                  <FileRow
                    key={stableKey(d.id)}
                    doc={d}
                    isMine={isMine}
                    anchorId={anchor(d.id)}
                  />
                ))}
                {caption && (
                  <p className="text-sm whitespace-pre-wrap break-words px-3 py-2">
                    {caption}
                  </p>
                )}
              </div>
            )}
          </div>
        </MessageActionsContext>
        <span className="text-[10px] text-muted-foreground/60 px-1 flex items-center gap-1">
          {new Date(lead.createdAt).toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isMine && !isDeleted && pending && <UploadingTick />}
          {isMine && !isDeleted && !pending && (
            <span className={cn(lead.isRead && "text-primary")}>
              {lead.isRead ? "✓✓" : "✓"}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// Dispatcher — takes one timeline item and renders either MessageBubble
// or FileBubble. Callers just map(items => <ChatTimelineItem item />) and
// don't have to switch on kind themselves.
export function ChatTimelineItem({
  item,
  currentUserId,
  setReplyingTo,
  scrollToTripMessage,
  scrollToTripDoc,
  onEditMessage,
  onDeleteMessage,
  onDeleteDoc,
  onDeleteAlbum,
  onImageClick,
  onImageLoaded,
  onOpenUser,
  docLabel,
}: {
  item: TimelineItem;
  currentUserId: string;
  setReplyingTo: (v: ReplyTarget | null) => void;
  scrollToTripMessage: (id: string) => void;
  scrollToTripDoc: (id: string) => void;
  onEditMessage: (id: string, original: string) => void;
  onDeleteMessage: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onDeleteAlbum: (id: string) => void;
  onImageClick: (id: string, signedUrl: string) => void;
  onImageLoaded: () => void;
  onOpenUser: (userId: string) => void;
  docLabel: (doc: { fileName: string; batchId?: string | null }) => string;
}) {
  if (item.kind === "album") {
    return (
      <AlbumBubble
        docs={item.docs}
        currentUserId={currentUserId}
        setReplyingTo={setReplyingTo}
        scrollToTripMessage={scrollToTripMessage}
        scrollToTripDoc={scrollToTripDoc}
        onOpenUser={onOpenUser}
        onDeleteAlbum={onDeleteAlbum}
        onImageClick={onImageClick}
        onImageLoaded={onImageLoaded}
        docLabel={docLabel}
      />
    );
  }
  if (item.kind === "msg") {
    return (
      <MessageBubble
        key={`msg-${item.data.id}`}
        msg={item.data}
        currentUserId={currentUserId}
        setReplyingTo={setReplyingTo}
        scrollToTripMessage={scrollToTripMessage}
        scrollToTripDoc={scrollToTripDoc}
        onEdit={onEditMessage}
        onDelete={onDeleteMessage}
        onOpenUser={onOpenUser}
        docLabel={docLabel}
      />
    );
  }
  return (
    <FileBubble
      key={`doc-${item.data.id}`}
      doc={item.data}
      currentUserId={currentUserId}
      setReplyingTo={setReplyingTo}
      scrollToTripMessage={scrollToTripMessage}
      scrollToTripDoc={scrollToTripDoc}
      onOpenUser={onOpenUser}
      onDelete={onDeleteDoc}
      onImageClick={onImageClick}
      onImageLoaded={onImageLoaded}
      docLabel={docLabel}
    />
  );
}
