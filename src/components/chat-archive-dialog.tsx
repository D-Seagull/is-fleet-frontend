"use client";

import { useState } from "react";
import { ArrowLeft, History } from "lucide-react";
import { useTranslations } from "next-intl";
import { fullName } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ChatArchiveSession,
  useArchivedSessionMessages,
  useTripChatArchive,
} from "@/hooks/use-trips";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export function ChatArchiveDialog({
  open,
  onOpenChange,
  tripId,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  currentUserId: string;
}) {
  const t = useTranslations("chat.archive");
  const [selected, setSelected] = useState<ChatArchiveSession | null>(null);
  const { data: sessions = [], isLoading } = useTripChatArchive(tripId);

  const handleClose = (v: boolean) => {
    if (!v) setSelected(null);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selected ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <History className="h-4 w-4" />
            )}
            {selected ? t("titleSession") : t("title")}
          </DialogTitle>
          <DialogDescription>
            {selected
              ? `${fullName(selected.driver) || t("unknownDriver")} ↔ ${fullName(selected.manager) || t("unknownManager")} · ${fmtDate(selected.startedAt)} – ${selected.endedAt ? fmtDate(selected.endedAt) : "?"}`
              : t("description")}
          </DialogDescription>
        </DialogHeader>

        {selected ? (
          <ArchivedMessages
            tripId={tripId}
            sessionId={selected.id}
            currentUserId={currentUserId}
          />
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground text-sm py-8 text-center">
            {t("noSessions")}
          </p>
        ) : (
          <ScrollArea className="max-h-[60vh] pr-3">
            <ul className="space-y-2">
              {sessions.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelected(s)}
                    className="w-full text-left rounded-md border p-3 hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">
                        {fullName(s.driver) || "—"}
                        <span className="text-muted-foreground"> ↔ </span>
                        {fullName(s.manager) || "—"}
                      </div>
                      {s.endReason && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {t(`reason.${s.endReason}`)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {fmtDate(s.startedAt)}
                      {s.endedAt ? ` – ${fmtDate(s.endedAt)}` : ""}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ArchivedMessages({
  tripId,
  sessionId,
  currentUserId,
}: {
  tripId: string;
  sessionId: string;
  currentUserId: string;
}) {
  const t = useTranslations("chat.archive");
  const { data: messages = [], isLoading } = useArchivedSessionMessages(
    tripId,
    sessionId,
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-12 w-1/2 ml-auto" />
        <Skeleton className="h-12 w-2/3" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        {t("noMessages")}
      </p>
    );
  }

  return (
    <ScrollArea className="max-h-[60vh] pr-3">
      <div className="space-y-2">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div
              key={m.id}
              className={`flex flex-col max-w-[80%] ${mine ? "ml-auto items-end" : "items-start"}`}
            >
              <div
                className={`rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}
              >
                {m.content}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {fullName(m.sender) || "—"} · {fmtDate(m.createdAt)}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
