"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Headset, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fullName } from "@/lib/format";
import {
  useSupportConversations,
  useSupportMarkRead,
  useSupportMessages,
  useSupportReply,
  type SupportConversation,
} from "@/hooks/use-support";

const ROLE_CLASS: Record<string, string> = {
  DRIVER: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  MANAGER: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  TEAMLEAD: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  ADMIN: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

/**
 * Support inbox: every chat a user has with "IS Fleet contact" (service
 * notices about their sign-in, and whatever they wrote back). Admins answer
 * here, as the contact — the user sees an ordinary chat message.
 */
export default function SupportPage() {
  const t = useTranslations("admin.support");
  const locale = useLocale();
  const { data: conversations, isLoading } = useSupportConversations();
  const [peerId, setPeerId] = React.useState<string | null>(null);
  const markRead = useSupportMarkRead();

  const open = (c: SupportConversation) => {
    setPeerId(c.user.id);
    if (c.unreadCount > 0) markRead.mutate(c.user.id);
  };
  const peer = conversations?.find((c) => c.user.id === peerId)?.user ?? null;

  const time = (iso: string) =>
    new Date(iso).toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="flex h-full flex-col p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-2">
        <Headset className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="grid min-h-0 flex-1 gap-4 md:grid-cols-[320px_1fr]">
        {/* Conversations */}
        <div className="min-h-0 overflow-y-auto rounded-lg border">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !conversations?.length ? (
            <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.user.id}
                type="button"
                onClick={() => open(c)}
                className={`flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/60 ${
                  c.user.id === peerId ? "bg-muted" : ""
                }`}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={c.user.avatar ?? undefined} />
                  <AvatarFallback>{c.user.firstName?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {fullName(c.user) || "—"}
                    </span>
                    <Badge
                      variant="outline"
                      className={`border-0 text-[10px] ${ROLE_CLASS[c.user.role] ?? ""}`}
                    >
                      {c.user.role}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.lastMessage.deletedAt
                      ? t("deleted")
                      : c.lastMessage.isDocument
                        ? `${t("file")}: ${c.lastMessage.content}`
                        : c.lastMessage.content}
                  </p>
                </div>
                {c.unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="flex min-h-[420px] flex-col rounded-lg border">
          {peer ? (
            <Thread
              peerId={peer.id}
              peerName={fullName(peer) || "—"}
              time={time}
            />
          ) : (
            <p className="m-auto text-sm text-muted-foreground">{t("pick")}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Thread({
  peerId,
  peerName,
  time,
}: {
  peerId: string;
  peerName: string;
  time: (iso: string) => string;
}) {
  const t = useTranslations("admin.support");
  const { data: messages, isLoading } = useSupportMessages(peerId);
  const reply = useSupportReply(peerId);
  const [text, setText] = React.useState("");
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages?.length]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    try {
      await reply.mutateAsync(content);
      setText("");
    } catch {
      toast.error(t("sendError"));
    }
  };

  return (
    <>
      <div className="border-b px-4 py-2.5 text-sm font-medium">{peerName}</div>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          messages?.map((m) => {
            const mine = m.senderId !== peerId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">
                    {m.deletedAt ? t("deleted") : m.content}
                  </p>
                  <p
                    className={`mt-1 text-[10px] ${
                      mine ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {mine ? `${t("you")} · ` : ""}
                    {time(m.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>
      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("placeholder")}
          rows={2}
          className="resize-none"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button onClick={send} disabled={!text.trim() || reply.isPending}>
          {reply.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span className="sr-only">{t("send")}</span>
        </Button>
      </div>
    </>
  );
}
