"use client";

import { useRouter } from "next/navigation";
import { FileText, Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { openDoc, downloadDoc } from "@/lib/doc-helpers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageReactionsCluster } from "@/components/message-reactions";
import { MessageActionsContext } from "@/components/message-actions-menu";
import { MessageQuote } from "@/components/message-quote";
import { systemMessageText } from "@/lib/system-message";
import type { TripMessage } from "@/hooks/use-trips";
import type { TripDocumentFull } from "@/hooks/use-documents";
import type { ReplyTarget } from "./chat-composer";

export type TimelineItem =
  | { kind: "msg"; data: TripMessage }
  | { kind: "file"; data: TripDocumentFull };

interface CommonProps {
  currentUserId: string;
  setReplyingTo: (v: ReplyTarget | null) => void;
  scrollToTripMessage: (id: string) => void;
  scrollToTripDoc: (id: string) => void;
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
}: MessageBubbleProps) {
  const t = useTranslations("chat");
  const router = useRouter();

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
    Date.now() - new Date(msg.createdAt).getTime() < 15 * 60 * 1000;
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
        "group flex items-center gap-2",
        isMine && "self-end",
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
          onClick={() => router.push(`/chat?userId=${msg.senderId}`)}
          className="shrink-0"
          title={t("messageUser", {
            name: fullName(msg.sender) || t("userFallback"),
          })}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {senderInitials}
            </AvatarFallback>
          </Avatar>
        </button>
      )}
      <div
        className={cn(
          "flex flex-col gap-0.5 max-w-[75%] min-w-0",
          isMine && "items-end",
        )}
      >
        {!isMine && (
          <button
            type="button"
            onClick={() => router.push(`/chat?userId=${msg.senderId}`)}
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
                    "px-3 py-2 text-sm whitespace-pre-wrap break-all",
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
                fileName={msg.replyToDocument.fileName}
                content=""
                isDeleted={!!msg.replyToDocument.deletedAt}
                onClick={() => scrollToTripDoc(msg.replyToDocument!.id)}
                variant={isMine ? "onPrimary" : "default"}
              />
            )}
            {isDeleted
              ? t("messageDeleted")
              : (() => {
                  const [subject, ...rest] = msg.content.split("\n");
                  return rest.length > 0 ? (
                    <>
                      <span className="font-semibold block">{subject}</span>
                      <span>{rest.join("\n")}</span>
                    </>
                  ) : (
                    msg.content
                  );
                })()}
          </div>
        </MessageActionsContext>
        <span className="text-[10px] text-muted-foreground/60 px-1 flex items-center gap-1">
          {msg.editedAt && !isDeleted && (
            <span
              title={t("editedAtTitle", {
                time: new Date(msg.editedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              })}
              className="italic"
            >
              {t("editedMark")}
            </span>
          )}
          {new Date(msg.createdAt).toLocaleTimeString([], {
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
}: FileBubbleProps) {
  const t = useTranslations("chat");
  const tActions = useTranslations("common.actions");
  const isMine = doc.uploadedBy === currentUserId;
  const isDeletedDoc = !!doc.deletedAt;
  const isPhoto =
    doc.fileType === "PHOTO" ||
    /\.(jpe?g|png|gif|webp|heic|avif)$/i.test(doc.fileName);
  const ext = doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
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
                fileName={doc.replyToDocument.fileName}
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
                  className="cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => onImageClick(doc.id, doc.signedUrl)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={doc.signedUrl}
                    alt={doc.fileName}
                    onLoad={onImageLoaded}
                    className="max-w-[200px] max-h-[200px] w-full object-cover block"
                  />
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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openDoc(doc.id)}
                  onKeyDown={(e) => e.key === "Enter" && openDoc(doc.id)}
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
                        isMine
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground",
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
          {new Date(doc.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isMine && !isDeletedDoc && (
            <span className={cn(doc.isRead && "text-primary")}>
              {doc.isRead ? "✓✓" : "✓"}
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
  onImageClick,
  onImageLoaded,
}: {
  item: TimelineItem;
  currentUserId: string;
  setReplyingTo: (v: ReplyTarget | null) => void;
  scrollToTripMessage: (id: string) => void;
  scrollToTripDoc: (id: string) => void;
  onEditMessage: (id: string, original: string) => void;
  onDeleteMessage: (id: string) => void;
  onDeleteDoc: (id: string) => void;
  onImageClick: (id: string, signedUrl: string) => void;
  onImageLoaded: () => void;
}) {
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
      onDelete={onDeleteDoc}
      onImageClick={onImageClick}
      onImageLoaded={onImageLoaded}
    />
  );
}
