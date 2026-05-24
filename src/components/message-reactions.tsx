"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  QUICK_REACTION_EMOJIS,
  useToggleReaction,
  type MessageReactionRow,
  type ReactionTargetType,
} from "@/hooks/use-message-reactions";

interface CommonProps {
  messageId: string;
  type: ReactionTargetType;
  reactions: MessageReactionRow[];
  currentUserId?: string;
}

/**
 * Quick-action reaction button rendered alongside a bubble. Shows a single
 * 👍 outline by default; hovering opens a popover with the full set
 * (👍 😮 😢). Click toggles, similar to Viber's heart.
 *
 * Placement: render this OUTSIDE the bubble container — on the right side
 * of the other party's messages, on the left side of your own.
 */
export function MessageReactionsTrigger({
  messageId,
  type,
  reactions,
  currentUserId,
  hideWhenReacted = false,
}: CommonProps & { hideWhenReacted?: boolean }) {
  const toggle = useToggleReaction(type);
  const [open, setOpen] = useState(false);
  const myEmoji =
    reactions.find((r) => r.userId === currentUserId)?.emoji ?? null;
  const display = myEmoji ?? "👍";
  const hasMyReaction = !!myEmoji;

  // In contexts that also show a persistent pills row (groups), the trigger
  // is redundant once the user has already reacted — hide it to declutter.
  if (hideWhenReacted && hasMyReaction) return null;

  return (
    <HoverCard open={open} onOpenChange={setOpen} openDelay={150} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => {
            // Click on trigger toggles the user's current reaction (off) if
            // any, otherwise adds the default 👍.
            toggle.mutate({ messageId, emoji: myEmoji ?? "👍" });
            setOpen(false);
          }}
          className={cn(
            "h-7 w-7 shrink-0 rounded-full border bg-background flex items-center justify-center text-sm transition-opacity",
            "opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100",
            hasMyReaction
              ? "opacity-100 bg-primary/10 border-primary"
              : "text-muted-foreground hover:bg-muted",
          )}
          title="React"
        >
          {display}
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        className="w-auto p-1 flex gap-1"
        side="top"
        align="center"
      >
        {QUICK_REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              toggle.mutate({ messageId, emoji });
              setOpen(false);
            }}
            className={cn(
              "h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-base",
              myEmoji === emoji && "bg-primary/10",
            )}
          >
            {emoji}
          </button>
        ))}
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Persistent pills under a bubble, one per distinct emoji, showing the
 * count. Your own reaction is highlighted. Click toggles the same way.
 */
export function MessageReactionsBar({
  messageId,
  type,
  reactions,
  currentUserId,
  isOwn,
}: CommonProps & { isOwn: boolean }) {
  const toggle = useToggleReaction(type);
  if (reactions.length === 0) return null;

  const counts = new Map<string, MessageReactionRow[]>();
  for (const r of reactions) {
    const arr = counts.get(r.emoji);
    if (arr) arr.push(r);
    else counts.set(r.emoji, [r]);
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1 mt-0.5",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      {[...counts.entries()].map(([emoji, list]) => {
        const isMine = list.some((r) => r.userId === currentUserId);
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => toggle.mutate({ messageId, emoji })}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] leading-none hover:bg-muted transition-colors",
              isMine && "bg-primary/10 border-primary text-primary",
            )}
          >
            <span>{emoji}</span>
            <span className="font-medium">{list.length}</span>
          </button>
        );
      })}
    </div>
  );
}
