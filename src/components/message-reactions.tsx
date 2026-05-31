"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
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
 * Reaction trigger alongside a bubble. By default shows a single 👍
 * outline (or your active emoji). Hovering the trigger reveals an inline
 * picker with all three emojis (👍 😮 😢). Click toggles.
 *
 * Pure-CSS hover (named `group/picker`) — no Radix wrappers, so the
 * onClick fires directly without any framework-level dismissal.
 */
export function MessageReactionsTrigger({
  messageId,
  type,
  reactions,
  currentUserId,
  hideWhenReacted = false,
}: CommonProps & { hideWhenReacted?: boolean }) {
  const toggle = useToggleReaction(type);
  const myEmoji =
    reactions.find((r) => r.userId === currentUserId)?.emoji ?? null;
  const display = myEmoji ?? "👍";
  const hasMyReaction = !!myEmoji;

  // Mobile/tablet support — long-press opens the picker, short tap toggles.
  // NOTE: hooks must run on every render — keep them above any early return.
  const [mobileOpen, setMobileOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close mobile picker when tapping anywhere outside the trigger area.
  useEffect(() => {
    if (!mobileOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [mobileOpen]);

  if (hideWhenReacted && hasMyReaction) return null;

  const startLongPress = () => {
    longPressed.current = false;
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setMobileOpen(true);
    }, 450);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className="relative group/picker shrink-0 touch-manipulation"
    >
      {/* Default trigger — small + grayscale when idle. Scales up to full
          colour on hover or when the user has reacted. */}
      <button
        type="button"
        onPointerDown={(e) => {
          if (e.pointerType === "touch" || e.pointerType === "pen") {
            startLongPress();
          }
        }}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (longPressed.current) {
            // Long-press already opened the picker; skip the tap-toggle.
            longPressed.current = false;
            return;
          }
          toggle.mutate({ messageId, emoji: myEmoji ?? "👍" });
        }}
        className={cn(
          // Fixed outer size — keeps layout stable when the emoji scales
          // up on hover/active. Only the font-size and opacity change.
          "h-7 w-7 flex items-center justify-center transition-all duration-150",
          hasMyReaction
            ? "text-base opacity-100"
            : "text-xs opacity-40 grayscale hover:text-base hover:opacity-100 hover:grayscale-0",
        )}
        title="React"
      >
        {display}
      </button>

      {/* Inline picker — appears when the trigger itself is hovered.
          Positioned above the trigger like a small popover. Uses
          padding-bottom (instead of margin) to create an invisible
          "bridge" hover-zone over the gap to the trigger, so moving the
          mouse up doesn't lose the hover state. */}
      <div
        className={cn(
          "absolute bottom-full left-1/2 -translate-x-1/2 pb-2 z-10",
          mobileOpen ? "flex" : "hidden group-hover/picker:flex",
        )}
      >
        <div
          className={cn(
            "flex gap-1 p-1 rounded-full border bg-popover shadow-md",
          )}
        >
        {QUICK_REACTION_EMOJIS.map((emoji) => {
          const isMine = myEmoji === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle.mutate({ messageId, emoji });
                setMobileOpen(false);
              }}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-base hover:bg-muted transition-colors",
                isMine && "bg-primary/10",
              )}
              title={`React ${emoji}`}
            >
              {emoji}
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline cluster shown next to a chat bubble. Always renders the user's
 * Trigger (their own reaction or an idle 👍 outline) and — if anyone else
 * reacted — their emojis as plain glyphs alongside it, without any chip
 * background. Counts appear only when an emoji has more than one user.
 *
 * Matches the mobile MessageReactionsCluster — same shape on both sides.
 */
export function MessageReactionsCluster({
  messageId,
  type,
  reactions,
  currentUserId,
}: CommonProps) {
  const toggle = useToggleReaction(type);

  // Group others' reactions (everyone except me) by emoji.
  const others = new Map<string, number>();
  for (const r of reactions) {
    if (r.userId === currentUserId) continue;
    others.set(r.emoji, (others.get(r.emoji) ?? 0) + 1);
  }

  return (
    <div className="inline-flex items-center gap-0.5 shrink-0">
      <MessageReactionsTrigger
        messageId={messageId}
        type={type}
        reactions={reactions}
        currentUserId={currentUserId}
      />
      {[...others.entries()].map(([emoji, count]) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggle.mutate({ messageId, emoji });
          }}
          className={cn(
            // Plain glyph — no background, no border. Slightly dimmed so
            // the user's own active emoji (in the Trigger) reads brighter.
            "inline-flex items-center gap-0.5 px-1 text-sm leading-none",
            "text-muted-foreground hover:text-foreground transition-colors",
          )}
          title={`React ${emoji}`}
        >
          <span className="opacity-80">{emoji}</span>
          {count > 1 && (
            <span className="text-[10px] font-semibold">{count}</span>
          )}
        </button>
      ))}
    </div>
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle.mutate({ messageId, emoji });
            }}
            className={cn(
              // No border — keeps the row clean and matches the mobile
              // reactions bar. Mine gets a subtle primary wash so the
              // user can tell their own reaction at a glance.
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] leading-none transition-colors",
              isMine
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/60",
            )}
          >
            <span className={cn(!isMine && "opacity-80")}>{emoji}</span>
            {list.length > 1 && (
              <span className="font-medium">{list.length}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
