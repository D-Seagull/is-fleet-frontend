"use client";

import { useState, useEffect, useRef } from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  X,
  Download,
  Loader2,
  ChevronDown,
  FolderOpen,
  Pencil,
  Paperclip,
  Check,
  Send,
  Smile,
  FileText,
  History,
} from "lucide-react";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import { fullName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { openDoc, downloadDoc } from "@/lib/doc-helpers";
import {
  appendInfiniteMessage,
  filterInfinitePages,
  mapInfinitePages,
  patchInfiniteMessage,
} from "@/lib/infinite-messages";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LoadOlderMessages } from "@/components/load-older-messages";
import { ChatArchiveDialog } from "@/components/chat-archive-dialog";
import { MessageReactionsCluster } from "@/components/message-reactions";
import { MessageActionsContext } from "@/components/message-actions-menu";
import { MessageQuote } from "@/components/message-quote";
import { useAuthStore } from "@/store/auth";
import { UNREAD_QUERY_KEY } from "@/hooks/use-unread";
import {
  useTripMessages,
  useDeleteMessage,
  useEditTripMessage,
  useTripChatArchive,
  type Trip,
  type TripMessage,
} from "@/hooks/use-trips";
import {
  useDocumentsByTrip,
  useUploadDocuments,
  useDeleteDocument,
  type TripDocumentFull,
} from "@/hooks/use-documents";
import { useReactionsSocketSync } from "@/hooks/use-message-reactions";
import { TripInfoCard } from "./trip-info-card";
import { TripAttachmentsContent } from "./trip-attachments-content";

export function TripChat({
  trip,
  truckId,
  currentUserId,
}: {
  trip: Trip;
  truckId: string;
  currentUserId: string;
  truckManagerId?: string | null;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isManager = user?.role === "ADMIN" || user?.role === "TEAMLEAD";
  useReactionsSocketSync({ tripId: trip.id });
  // Only the trip's current driver / manager may send messages in the
  // active session — backend enforces this too. Other roles see a notice.
  const isActiveParticipant =
    trip.driverId === currentUserId || trip.managerId === currentUserId;
  const {
    data: messages = [],
    isLoading,
    fetchOlder: fetchOlderTrip,
    hasOlder: hasOlderTrip,
    isFetchingOlder: isFetchingOlderTrip,
  } = useTripMessages(trip.id);
  const { data: tripDocs = [] } = useDocumentsByTrip(trip.id);
  const { data: archiveSessions = [] } = useTripChatArchive(trip.id);
  const deleteMessage = useDeleteMessage(trip.id);
  const editMessage = useEditTripMessage(trip.id);
  const deleteDocument = useDeleteDocument(truckId);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<{ id: string; original: string } | null>(
    null,
  );
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    targetType: "msg" | "doc";
    senderName: string | null;
    content: string;
    isDeleted: boolean;
  } | null>(null);

  const scrollToTripMessage = (messageId: string) => {
    const el = document.getElementById(`trip-msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-lg");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "rounded-lg");
    }, 1500);
  };
  const scrollToTripDoc = (docId: string) => {
    const el = document.getElementById(`trip-doc-${docId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-2", "ring-primary", "rounded-lg");
    setTimeout(() => {
      el.classList.remove("ring-2", "ring-primary", "rounded-lg");
    }, 1500);
  };
  const [showEmoji, setShowEmoji] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<{
    id: string;
    signedUrl: string;
  } | null>(null);
  const [showTripDocs, setShowTripDocs] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  // true  → user is within ~80px of the bottom (messages are visible)
  // false → user scrolled up to read history
  const nearBottomRef = useRef(true);
  const initialScrollDone = useRef(false);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadDocuments(truckId);
  // Files staged for sending — uploaded together with the text caption on
  // Send so a single reply can carry both a file and text.
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // unified timeline: messages + files sorted by createdAt
  type TimelineItem =
    | { kind: "msg"; data: TripMessage }
    | { kind: "file"; data: TripDocumentFull };

  const timeline: TimelineItem[] = [
    ...messages.map((m) => ({ kind: "msg" as const, data: m })),
    ...tripDocs.map((d) => ({ kind: "file" as const, data: d })),
  ].sort(
    (a, b) =>
      new Date(a.data.createdAt).getTime() -
      new Date(b.data.createdAt).getTime(),
  );

  // Keep currentUserId out of the socket effect's deps — it changes after auth
  // hydrates and would otherwise re-register listeners (the old `connect`
  // listener leaked because off() got the wrong reference).
  const currentUserIdRef = useRef(currentUserId);
  const isManagerRef = useRef(isManager);
  useEffect(() => {
    isManagerRef.current = isManager;
  }, [isManager]);
  useEffect(() => {
    currentUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Only acknowledge reads when the browser tab is visible. Without this,
  // the sender sees ✓✓ even though the manager had the tab in the
  // background and never actually saw the message.
  const tabVisibleRef = useRef(
    typeof document !== "undefined"
      ? document.visibilityState === "visible"
      : true,
  );
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      tabVisibleRef.current = document.visibilityState === "visible";
      // On returning to the tab, catch up — mark any unread as read.
      if (tabVisibleRef.current) {
        getSocket().emit("markTripRead", { tripId: trip.id });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [trip.id]);

  useEffect(() => {
    const socket = getSocket();
    const joinRoom = () => socket.emit("joinTrip", { tripId: trip.id });
    const markRead = () => {
      if (!tabVisibleRef.current) return;
      socket.emit("markTripRead", { tripId: trip.id });
    };
    const onConnect = () => {
      joinRoom();
      markRead();
    };

    joinRoom();
    markRead();
    socket.on("connect", onConnect);

    const handleNew = (msg: TripMessage & { tempId?: string | null }) => {
      if (msg.tripId !== trip.id) return;

      // Privacy: ignore messages from a session the current user wasn't in.
      // Without this, an old manager who happens to still have the trip
      // open would receive the new manager's chat over the wire.
      const meId = currentUserIdRef.current;
      const inSession =
        msg.session?.driverId === meId || msg.session?.managerId === meId;
      if (!isManagerRef.current && !inSession) return;

      queryClient.setQueryData<InfiniteData<TripMessage[]>>(
        ["trip-messages", trip.id],
        (prev) => {
          // Optimistic swap: if the server echoed our tempId, drop the
          // placeholder and append the real row in its place.
          if (msg.tempId) {
            const withoutTemp = filterInfinitePages(
              prev,
              (m) => m.id !== msg.tempId,
            );
            return appendInfiniteMessage(withoutTemp, msg);
          }
          return appendInfiniteMessage(prev, msg);
        },
      );
      // Оновлюємо лічильники непрочитаних у шапці та картках
      void queryClient.invalidateQueries({ queryKey: UNREAD_QUERY_KEY });
      // Only mark as read if the user is actually looking at the bottom.
      // If they scrolled up, the pill will appear and markRead fires on scroll-down.
      if (msg.senderId !== meId && nearBottomRef.current) markRead();

      // Sound: ping for incoming non-system messages from someone else.
      if (!msg.isSystem && msg.senderId !== meId) {
        try {
          const a = new Audio("/sounds/is_message.mp3");
          a.volume = 0.6;
          void a.play();
        } catch {
          /* autoplay can be blocked until first user interaction — silent */
        }
      }
    };
    const handleNewDoc = (doc: TripDocumentFull) => {
      if (doc.tripId !== trip.id) return;
      queryClient.setQueryData<TripDocumentFull[]>(
        ["documents-trip", trip.id],
        (old = []) => (old.some((d) => d.id === doc.id) ? old : [...old, doc]),
      );
      // Also patch the truck-scoped cache so the docs sheet stays fresh.
      queryClient.invalidateQueries({ queryKey: ["documents-truck", truckId] });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
      if (doc.uploadedBy !== currentUserIdRef.current && nearBottomRef.current)
        markRead();
    };
    const handleMsgDeleted = (payload: {
      tripId: string;
      messageId: string;
    }) => {
      if (payload.tripId !== trip.id) return;
      queryClient.setQueryData<InfiniteData<TripMessage[]>>(
        ["trip-messages", trip.id],
        (prev) =>
          filterInfinitePages(prev, (m) => m.id !== payload.messageId),
      );
    };
    const handleMsgEdited = (payload: {
      tripId: string;
      message: TripMessage;
    }) => {
      if (payload.tripId !== trip.id) return;
      queryClient.setQueryData<InfiniteData<TripMessage[]>>(
        ["trip-messages", trip.id],
        (prev) =>
          patchInfiniteMessage(prev, payload.message.id, (m) => ({
            ...m,
            ...payload.message,
          })),
      );
    };
    const handleDocDeleted = (payload: {
      tripId: string;
      documentId: string;
    }) => {
      if (payload.tripId !== trip.id) return;
      // Soft delete — patch the row so the chat shows a tombstone. The
      // truck-level / company-level views can still purge via invalidate
      // because they don't render soft-deleted rows.
      queryClient.setQueryData<TripDocumentFull[]>(
        ["documents-trip", trip.id],
        (old = []) =>
          old.map((d) =>
            d.id === payload.documentId
              ? { ...d, deletedAt: new Date().toISOString(), signedUrl: "" }
              : d,
          ),
      );
      queryClient.invalidateQueries({ queryKey: ["documents-truck", truckId] });
      queryClient.invalidateQueries({ queryKey: ["documents-all"] });
    };
    const handleRead = (payload: {
      tripId: string;
      messageIds: string[];
      documentIds: string[];
    }) => {
      if (payload.tripId !== trip.id) return;
      const msgIds = new Set(payload.messageIds ?? []);
      const docIds = new Set(payload.documentIds ?? []);
      if (msgIds.size > 0) {
        queryClient.setQueryData<InfiniteData<TripMessage[]>>(
          ["trip-messages", trip.id],
          (prev) =>
            mapInfinitePages(prev, (m) =>
              msgIds.has(m.id) ? { ...m, isRead: true } : m,
            ),
        );
      }
      if (docIds.size > 0) {
        queryClient.setQueryData<TripDocumentFull[]>(
          ["documents-trip", trip.id],
          (old = []) =>
            old.map((d) => (docIds.has(d.id) ? { ...d, isRead: true } : d)),
        );
      }
    };
    // Driver / manager changed — refetch trip + messages + archive so the
    // current pair sees the new system message and old chat is hidden.
    const handleTripUpdated = (payload: { tripId: string }) => {
      if (payload.tripId !== trip.id) return;
      queryClient.invalidateQueries({ queryKey: ["trip-messages", trip.id] });
      queryClient.invalidateQueries({
        queryKey: ["trip-chat-archive", trip.id],
      });
      queryClient.invalidateQueries({ queryKey: ["trips-by-truck", truckId] });
    };

    socket.on("newMessage", handleNew);
    socket.on("newDocument", handleNewDoc);
    socket.on("tripMessagesRead", handleRead);
    socket.on("messageDeleted", handleMsgDeleted);
    socket.on("messageEdited", handleMsgEdited);
    socket.on("documentDeleted", handleDocDeleted);
    socket.on("tripUpdated", handleTripUpdated);
    return () => {
      socket.off("connect", onConnect);
      socket.off("newMessage", handleNew);
      socket.off("newDocument", handleNewDoc);
      socket.off("tripMessagesRead", handleRead);
      socket.off("messageDeleted", handleMsgDeleted);
      socket.off("messageEdited", handleMsgEdited);
      socket.off("documentDeleted", handleDocDeleted);
      socket.off("tripUpdated", handleTripUpdated);
    };
  }, [trip.id, queryClient, truckId]);

  // ── Typing indicator ────────────────────────────────────────────────────
  // Track who's currently typing in this trip. We only ever expect the
  // counterparty (one driver ↔ one manager), but use a Map<userId, name>
  // to handle race conditions and future N-party chats cleanly.
  const [typers, setTypers] = useState<Map<string, string>>(new Map());
  // Per-typer auto-clear: if we never receive `userStopTyping` (e.g. socket
  // drop), the indicator vanishes after 4s on its own.
  const typerTimeoutsRef = useRef<
    Map<string, ReturnType<typeof setTimeout>>
  >(new Map());
  useEffect(() => {
    const socket = getSocket();
    const onTyping = (payload: {
      tripId: string;
      user: { id: string; firstName: string; lastName: string | null };
    }) => {
      if (payload.tripId !== trip.id) return;
      if (payload.user.id === currentUserIdRef.current) return;
      setTypers((prev) => {
        const next = new Map(prev);
        next.set(payload.user.id, fullName(payload.user) || "Someone");
        return next;
      });
      // Reset auto-clear timeout
      const prev = typerTimeoutsRef.current.get(payload.user.id);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        setTypers((p) => {
          const n = new Map(p);
          n.delete(payload.user.id);
          return n;
        });
        typerTimeoutsRef.current.delete(payload.user.id);
      }, 4000);
      typerTimeoutsRef.current.set(payload.user.id, t);
    };
    const onStopTyping = (payload: { tripId: string; userId: string }) => {
      if (payload.tripId !== trip.id) return;
      const t = typerTimeoutsRef.current.get(payload.userId);
      if (t) clearTimeout(t);
      typerTimeoutsRef.current.delete(payload.userId);
      setTypers((prev) => {
        const next = new Map(prev);
        next.delete(payload.userId);
        return next;
      });
    };
    socket.on("userTyping", onTyping);
    socket.on("userStopTyping", onStopTyping);
    const timers = typerTimeoutsRef.current;
    return () => {
      socket.off("userTyping", onTyping);
      socket.off("userStopTyping", onStopTyping);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, [trip.id]);

  // Outbound: throttle "typing" emit to once per debounce window; emit
  // "stopTyping" 2s after last keystroke.
  const isTypingRef = useRef(false);
  const stopTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  function notifyTyping() {
    if (!isActiveParticipant) return;
    const socket = getSocket();
    if (!isTypingRef.current) {
      socket.emit("typing", { tripId: trip.id });
      isTypingRef.current = true;
    }
    if (stopTypingTimeoutRef.current)
      clearTimeout(stopTypingTimeoutRef.current);
    stopTypingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { tripId: trip.id });
      isTypingRef.current = false;
    }, 2000);
  }
  function notifyStopTyping() {
    if (stopTypingTimeoutRef.current)
      clearTimeout(stopTypingTimeoutRef.current);
    if (isTypingRef.current) {
      getSocket().emit("stopTyping", { tripId: trip.id });
      isTypingRef.current = false;
    }
  }
  // Cleanup on unmount / trip switch
  useEffect(() => {
    return () => {
      if (stopTypingTimeoutRef.current)
        clearTimeout(stopTypingTimeoutRef.current);
      if (isTypingRef.current) {
        getSocket().emit("stopTyping", { tripId: trip.id });
        isTypingRef.current = false;
      }
    };
  }, [trip.id]);

  // Smart scroll: jump to bottom when near bottom; show "↓ N new" pill when
  // user is scrolled up (Viber/Telegram pattern).
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || (messages.length === 0 && tripDocs.length === 0)) return;
    if (nearBottomRef.current) {
      if (!initialScrollDone.current) {
        // First load — instant jump, no animation
        el.scrollTop = el.scrollHeight;
        initialScrollDone.current = true;
      } else {
        el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      }
    } else if (initialScrollDone.current) {
      // User scrolled up — show pill, don't force-scroll
      setNewMsgCount((n) => n + 1);
    }
  }, [messages.length, tripDocs.length]);

  async function handleSend() {
    const trimmed = text.trim();
    const hasFiles = pendingFiles.length > 0;
    if (!trimmed && !hasFiles && !editing) return;

    // Edit mode — PATCH instead of sending a new message.
    if (editing) {
      if (!trimmed) return;
      if (trimmed === editing.original.trim()) {
        setEditing(null);
        setText("");
        return;
      }
      try {
        await editMessage.mutateAsync({ id: editing.id, content: trimmed });
      } finally {
        setEditing(null);
        setText("");
        notifyStopTyping();
      }
      return;
    }

    // User is sending — snap back to bottom so they see their own message.
    nearBottomRef.current = true;
    setNewMsgCount(0);
    const replyMsgId =
      replyingTo?.targetType === "msg" ? replyingTo.id : null;
    const replyDocId =
      replyingTo?.targetType === "doc" ? replyingTo.id : null;

    // Telegram-style: text + files = ONE file bubble with a caption (NOT a
    // separate text message). Pure text or pure files keep their existing
    // single-channel paths.
    if (hasFiles) {
      setUploading(true);
      try {
        await upload.mutateAsync({
          tripId: trip.id,
          files: pendingFiles,
          replyToMessageId: replyMsgId,
          replyToDocumentId: replyDocId,
          caption: trimmed || null,
        });
      } catch (err) {
        setUploading(false);
        console.error("[trip-chat] file upload failed", err);
        return;
      }
      setUploading(false);
      setPendingFiles([]);
      notifyStopTyping();
      setText("");
      setReplyingTo(null);
      return;
    }

    // Optimistic text message — drop a "pending" bubble in the cache so the
    // user sees their message instantly, then swap it out when the real one
    // arrives over WS. Gateway echoes `tempId` back so we can locate the
    // placeholder.
    if (trimmed) {
      const tempId = `temp-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const meId = currentUserIdRef.current ?? "";
      const optimistic: TripMessage = {
        id: tempId,
        tripId: trip.id,
        senderId: meId,
        content: trimmed,
        translatedContent: null,
        isRead: false,
        isSystem: false,
        createdAt: new Date().toISOString(),
        deletedAt: null,
        editedAt: null,
        replyToId: replyMsgId,
        replyTo:
          replyingTo?.targetType === "msg"
            ? {
                id: replyingTo.id,
                content: replyingTo.content,
                deletedAt: replyingTo.isDeleted
                  ? new Date().toISOString()
                  : null,
                sender: {
                  id: "",
                  firstName: replyingTo.senderName ?? "",
                  lastName: null,
                  avatar: null,
                },
              }
            : null,
        replyToDocumentId: replyDocId,
        replyToDocument:
          replyingTo?.targetType === "doc"
            ? {
                id: replyingTo.id,
                fileName: replyingTo.content,
                fileType: "DOCUMENT",
                deletedAt: replyingTo.isDeleted
                  ? new Date().toISOString()
                  : null,
                uploader: {
                  id: "",
                  firstName: replyingTo.senderName ?? "",
                  lastName: null,
                  avatar: null,
                },
              }
            : null,
        sender: {
          id: meId,
          firstName: user?.firstName ?? "",
          lastName: user?.lastName ?? null,
          avatar: user?.avatar ?? null,
          role: user?.role ?? "MANAGER",
        },
        reactions: [],
      };
      queryClient.setQueryData<InfiniteData<TripMessage[]>>(
        ["trip-messages", trip.id],
        (prev) => appendInfiniteMessage(prev, optimistic),
      );

      getSocket().emit("sendMessage", {
        tripId: trip.id,
        content: trimmed,
        replyToId: replyMsgId,
        replyToDocumentId: replyDocId,
        tempId,
      });
    }

    notifyStopTyping();
    setText("");
    setReplyingTo(null);
  }

  function onEmojiClick(data: EmojiClickData) {
    setText((prev) => prev + data.emoji);
    setShowEmoji(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // Stage only — the actual upload runs from handleSend so a caption + reply
    // target can travel with the file in a single user action.
    setPendingFiles((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePendingFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0">
        <TripInfoCard
          trip={trip}
          truckId={truckId}
          docsCount={tripDocs.length}
          onDocsClick={() => setShowTripDocs(true)}
        />
      </div>

      {/* Trip docs sheet */}
      <Sheet open={showTripDocs} onOpenChange={setShowTripDocs}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md flex flex-col p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-3 border-b">
            <SheetTitle className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Trip Documents
            </SheetTitle>
            {trip.orderNumber && (
              <p className="text-xs text-muted-foreground">
                Order #{trip.orderNumber}
              </p>
            )}
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <TripAttachmentsContent
              tripId={trip.id}
              truckId={truckId}
              canDelete
              canUpload
            />
          </div>
        </SheetContent>
      </Sheet>

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
          <div className="absolute bottom-4 flex gap-2">
            <button
              className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-white text-sm transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                downloadDoc(lightbox.id);
              }}
            >
              <Download className="h-4 w-4" /> Download
            </button>
          </div>
        </div>
      )}

      {/* Archive banner — visible to every role. Whether the archive
          contains anything for this user is decided by the server (see
          TripChatSessionsService.findArchived). */}
      {archiveSessions.length > 0 && (
        <div className="shrink-0 border-y bg-muted/30 px-3 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
            <History className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {archiveSessions.length} previous chat
              {archiveSessions.length === 1 ? "" : "s"} on this trip
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs shrink-0"
            onClick={() => setShowArchive(true)}
          >
            View archive
          </Button>
        </div>
      )}

      <ChatArchiveDialog
        open={showArchive}
        onOpenChange={setShowArchive}
        tripId={trip.id}
        currentUserId={currentUserId}
      />

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollContainerRef}
          className="absolute inset-0 overflow-y-auto flex flex-col gap-2 py-2 pr-1"
          onScroll={(e) => {
            const el = e.currentTarget;
            const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
            const wasNear = nearBottomRef.current;
            nearBottomRef.current = dist < 80;
            if (!wasNear && nearBottomRef.current) {
              // User scrolled back to bottom — dismiss pill and mark visible msgs read
              setNewMsgCount(0);
              if (tabVisibleRef.current)
                getSocket().emit("markTripRead", { tripId: trip.id });
            }
          }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              No messages yet. Start the conversation.
            </p>
          ) : (
            <>
              <LoadOlderMessages
                hasOlder={hasOlderTrip}
                isFetchingOlder={isFetchingOlderTrip}
                onLoadOlder={() => void fetchOlderTrip()}
              />
              {timeline.map((item) => {
                if (item.kind === "msg") {
                  const msg = item.data;

                  // System messages (e.g. "New driver assigned: ...") render as a
                  // centered grey label, like Telegram's group event notices.
                  if (msg.isSystem) {
                    return (
                      <div
                        key={`msg-${msg.id}`}
                        className="self-center text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full"
                      >
                        {msg.content}
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
                    Date.now() - new Date(msg.createdAt).getTime() <
                      15 * 60 * 1000;
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
                    onEdit: canEdit
                      ? () => {
                          setEditing({ id: msg.id, original: msg.content });
                          setText(msg.content);
                          setReplyingTo(null);
                          setPendingFiles([]);
                        }
                      : undefined,
                    onDelete: isMine
                      ? () => deleteMessage.mutate(msg.id)
                      : undefined,
                  };
                  return (
                    <div
                      key={`msg-${msg.id}`}
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
                          onClick={() =>
                            router.push(`/chat?userId=${msg.senderId}`)
                          }
                          className="shrink-0"
                          title={`Message ${fullName(msg.sender) || "user"}`}
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
                            onClick={() =>
                              router.push(`/chat?userId=${msg.senderId}`)
                            }
                            className="text-xs text-muted-foreground px-1 hover:underline cursor-pointer text-left"
                          >
                            {fullName(msg.sender) || "Unknown"}
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
                                onClick={() =>
                                  scrollToTripMessage(msg.replyTo!.id)
                                }
                                variant={isMine ? "onPrimary" : "default"}
                              />
                            )}
                            {!isDeleted && msg.replyToDocument && (
                              <MessageQuote
                                kind="doc"
                                senderName={fullName(
                                  msg.replyToDocument.uploader,
                                )}
                                fileName={msg.replyToDocument.fileName}
                                content=""
                                isDeleted={!!msg.replyToDocument.deletedAt}
                                onClick={() =>
                                  scrollToTripDoc(msg.replyToDocument!.id)
                                }
                                variant={isMine ? "onPrimary" : "default"}
                              />
                            )}
                            {isDeleted
                              ? "Повідомлення видалено"
                              : (() => {
                                  const [subject, ...rest] =
                                    msg.content.split("\n");
                                  return rest.length > 0 ? (
                                    <>
                                      <span className="font-semibold block">
                                        {subject}
                                      </span>
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
                              title={`Редаговано о ${new Date(msg.editedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                              className="italic"
                            >
                              (ред.)
                            </span>
                          )}
                          {new Date(msg.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {isMine && (
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

                // file item
                const doc = item.data;
                const isMine = doc.uploadedBy === currentUserId;
                const isDeletedDoc = !!doc.deletedAt;
                const isPhoto =
                  doc.fileType === "PHOTO" ||
                  /\.(jpe?g|png|gif|webp|heic|avif)$/i.test(doc.fileName);
                const ext =
                  doc.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
                const docActions = {
                  onCopy: () => navigator.clipboard.writeText(doc.fileName),
                  onReply: () =>
                    setReplyingTo({
                      id: doc.id,
                      targetType: "doc" as const,
                      senderName: fullName(doc.uploader) || null,
                      content: doc.fileName,
                      isDeleted: isDeletedDoc,
                    }),
                  onDelete: isMine
                    ? () => deleteDocument.mutate(doc.id)
                    : undefined,
                };
                return (
                  <div
                    key={`doc-${doc.id}`}
                    className={cn(
                      "group flex items-center gap-3",
                      // Own: trigger on the LEFT, bubble on the right.
                      // Other: bubble on the left, trigger on the RIGHT (reverse).
                      isMine ? "self-end" : "self-start flex-row-reverse",
                    )}
                  >
                    {/* Doc sidekick — cluster style. flex-row-reverse on
                        `other` keeps the cluster on the visual right. */}
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
                        {fullName(doc.uploader) || "Unknown"}
                      </span>
                      <MessageActionsContext
                        actions={docActions}
                        isOwn={isMine}
                        isDeleted={isDeletedDoc}
                      >
                        <div
                          id={`trip-doc-${doc.id}`}
                          className="transition-shadow"
                        >
                          {!isDeletedDoc && doc.replyTo && (
                            <MessageQuote
                              senderName={fullName(doc.replyTo.sender)}
                              content={doc.replyTo.content}
                              isDeleted={!!doc.replyTo.deletedAt}
                              onClick={() =>
                                scrollToTripMessage(doc.replyTo!.id)
                              }
                              variant="default"
                            />
                          )}
                          {!isDeletedDoc && doc.replyToDocument && (
                            <MessageQuote
                              kind="doc"
                              senderName={fullName(
                                doc.replyToDocument.uploader,
                              )}
                              fileName={doc.replyToDocument.fileName}
                              content=""
                              isDeleted={!!doc.replyToDocument.deletedAt}
                              onClick={() =>
                                scrollToTripDoc(doc.replyToDocument!.id)
                              }
                              variant="default"
                            />
                          )}
                          {isDeletedDoc ? (
                            <div className="rounded-2xl bg-muted/40 text-muted-foreground italic px-3 py-1 text-xs whitespace-nowrap">
                              Файл видалено
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
                                onClick={() =>
                                  setLightbox({
                                    id: doc.id,
                                    signedUrl: doc.signedUrl,
                                  })
                                }
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={doc.signedUrl}
                                  alt={doc.fileName}
                                  onLoad={() => {
                                    if (nearBottomRef.current) {
                                      const el = scrollContainerRef.current;
                                      if (el)
                                        el.scrollTo({
                                          top: el.scrollHeight,
                                          behavior: "smooth",
                                        });
                                    }
                                  }}
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
                                onKeyDown={(e) =>
                                  e.key === "Enter" && openDoc(doc.id)
                                }
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
                                  title="Download"
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
              })}
            </>
          )}
        </div>
        {/* "↓ N new" pill — visible when user scrolled up and new messages arrived */}
        {newMsgCount > 0 && (
          <button
            className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold px-4 py-1.5 shadow-lg hover:bg-primary/90 transition-colors z-10"
            onClick={() => {
              nearBottomRef.current = true;
              setNewMsgCount(0);
              const el = scrollContainerRef.current;
              if (el)
                el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
              if (tabVisibleRef.current)
                getSocket().emit("markTripRead", { tripId: trip.id });
            }}
          >
            <ChevronDown className="h-3.5 w-3.5" />
            {newMsgCount} new
          </button>
        )}
      </div>
      {/* Typing indicator — animated dots matching the direct-chat style. */}
      {typers.size > 0 && (
        <div className="shrink-0 px-4 py-1 text-xs text-muted-foreground flex items-center gap-1">
          <span>
            {Array.from(typers.values()).join(", ")}{" "}
            {typers.size === 1 ? "набирає" : "набирають"}
          </span>
          <span className="flex gap-0.5">
            <span className="animate-bounce delay-0">.</span>
            <span className="animate-bounce delay-100">.</span>
            <span className="animate-bounce delay-200">.</span>
          </span>
        </div>
      )}

      <div className="shrink-0 border-t pt-3 relative">
        {!isActiveParticipant ? (
          <div className="px-3 py-3 text-center text-xs text-muted-foreground">
            Ви більше не учасник цього чату — перегляд тільки для читання.
          </div>
        ) : (
          <>
            {/* Emoji picker */}
            {showEmoji && (
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  theme={Theme.AUTO}
                  width={300}
                  height={380}
                />
              </div>
            )}

            {editing && (
              <div className="mb-2 flex items-start gap-2">
                <div className="flex-1 border-l-2 border-primary pl-2 py-1 bg-primary/5 rounded-r">
                  <p className="text-[11px] font-semibold text-primary leading-tight flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    Редагування повідомлення
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">
                    {editing.original}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setText("");
                  }}
                  title="Скасувати редагування"
                  className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {replyingTo && !editing && (
              <div className="mb-2 flex items-start gap-2">
                <div className="flex-1 border-l-2 border-primary pl-2 py-1 bg-primary/5 rounded-r">
                  <p className="text-[11px] font-semibold text-primary leading-tight">
                    Reply to {replyingTo.senderName ?? "Unknown"}
                  </p>
                  <p
                    className={cn(
                      "text-[11px] text-muted-foreground leading-tight truncate flex items-center gap-1",
                      replyingTo.isDeleted && "italic",
                    )}
                  >
                    {replyingTo.targetType === "doc" &&
                      !replyingTo.isDeleted && (
                        <Paperclip className="h-3 w-3 shrink-0" />
                      )}
                    <span className="truncate">
                      {replyingTo.isDeleted
                        ? replyingTo.targetType === "doc"
                          ? "Файл видалено"
                          : "Повідомлення видалено"
                        : replyingTo.content}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  title="Cancel reply"
                  className="h-6 w-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {pendingFiles.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {pendingFiles.map((f, i) => (
                  <div
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs max-w-[200px]"
                  >
                    <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removePendingFile(i)}
                      title="Remove"
                      className="shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-1.5">
              {/* Файл */}
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                title="Attach file"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                className="hidden"
                onChange={handleFileUpload}
              />

              {/* Смайли */}
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                title="Emoji"
                onClick={() => setShowEmoji((v) => !v)}
              >
                <Smile className="h-4 w-4 text-muted-foreground" />
              </Button>

              {/* Інпут */}
              <Input
                placeholder={
                  editing ? "Редагуйте повідомлення…" : "Type a message..."
                }
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (e.target.value.length > 0) notifyTyping();
                  else notifyStopTyping();
                }}
                onBlur={notifyStopTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handleSend();
                  if (e.key === "Escape") {
                    setShowEmoji(false);
                    if (editing) {
                      setEditing(null);
                      setText("");
                    }
                  }
                }}
                className="flex-1"
              />

              {/* Відправити / Зберегти */}
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!text.trim() && pendingFiles.length === 0}
                title={editing ? "Зберегти" : "Send"}
                className="h-9 w-9 shrink-0"
              >
                {editing ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
