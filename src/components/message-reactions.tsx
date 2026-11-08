"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  MORE_REACTION_EMOJIS,
  QUICK_REACTION_EMOJIS,
  useToggleReaction,
  type MessageReactionRow,
  type ReactionTargetType,
} from "@/hooks/use-message-reactions";

/** Approx. width of the picker (6 buttons / 6-column grid), px. */
const PICKER_WIDTH = 232;
/** Height of the quick row / the expanded "+" grid (incl. gap), px. */
const PICKER_GRID_HEIGHT = 210;

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
  const t = useTranslations("chat");
  const toggle = useToggleReaction(type);
  const myEmoji =
    reactions.find((r) => r.userId === currentUserId)?.emoji ?? null;
  const display = myEmoji ?? "👍";
  const hasMyReaction = !!myEmoji;

  // Mobile/tablet support — long-press opens the picker, short tap toggles.
  // NOTE: hooks must run on every render — keep them above any early return.
  const [mobileOpen, setMobileOpen] = useState(false);
  // The "+" grid with the extra emojis (reset whenever the picker closes).
  const [moreOpen, setMoreOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [openUp, setOpenUp] = useState(true);
  const [align, setAlign] = useState<"center" | "left" | "right">("center");

  // Flip the picker below the trigger when there isn't room above inside the
  // scrollable message list — otherwise the top message's picker is clipped by
  // the list's overflow. Decided on hover / just before a long-press opens.
  // Sized for the tall "+" grid right away: flipping the picker after the
  // click moved it out from under the cursor, which closed it ("opens every
  // other time").
  const decideDirection = (needed: number = PICKER_GRID_HEIGHT) => {
    const el = wrapperRef.current;
    if (!el) return;
    let p: HTMLElement | null = el.parentElement;
    while (p) {
      const oy = getComputedStyle(p).overflowY;
      if (oy === "auto" || oy === "scroll") break;
      p = p.parentElement;
    }
    const rect = el.getBoundingClientRect();
    const boundTop = p ? p.getBoundingClientRect().top : 0;
    const boundBottom = Math.min(
      window.innerHeight,
      p ? p.getBoundingClientRect().bottom : window.innerHeight,
    );
    const above = rect.top - boundTop;
    const below = boundBottom - rect.bottom;
    // Up when it fits there; otherwise wherever there is more room.
    setOpenUp(above > needed || above >= below);

    // Sideways: the picker is ~230px wide, so near an edge of the list
    // (own messages sit at the right) centring on the trigger would stick out
    // and add a horizontal scrollbar. Anchor to the edge that has room.
    const bounds = p ? p.getBoundingClientRect() : null;
    const minX = Math.max(0, bounds?.left ?? 0);
    const maxX = Math.min(window.innerWidth, bounds?.right ?? window.innerWidth);
    const center = rect.left + rect.width / 2;
    const half = PICKER_WIDTH / 2;
    if (center + half > maxX) setAlign("right");
    else if (center - half < minX) setAlign("left");
    else setAlign("center");
  };

  // Close mobile picker when tapping anywhere outside the trigger area.
  useEffect(() => {
    if (!mobileOpen) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
        setMoreOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [mobileOpen]);

  if (hideWhenReacted && hasMyReaction) return null;

  const startLongPress = () => {
    decideDirection();
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
      onMouseEnter={() => decideDirection()}
      onMouseLeave={() => setMoreOpen(false)}
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
        title={t("react")}
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
          // w-max: an absolute box otherwise shrinks to the 28px trigger
          // when anchored with left-0 / right-0, and the grid collapses.
          "absolute z-10 w-max",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "left" && "left-0",
          align === "right" && "right-0",
          openUp ? "bottom-full pb-2" : "top-full pt-2",
          mobileOpen ? "flex" : "hidden group-hover/picker:flex",
        )}
      >
        <div
          className={cn(
            "bg-popover shadow-md border",
            moreOpen
              ? "grid grid-cols-6 gap-1 p-1.5 rounded-2xl w-max"
              : "flex gap-1 p-1 rounded-full",
          )}
        >
        {(moreOpen
          ? [...QUICK_REACTION_EMOJIS, ...MORE_REACTION_EMOJIS]
          : QUICK_REACTION_EMOJIS
        ).map((emoji) => {
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
                setMoreOpen(false);
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
        {!moreOpen && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMoreOpen(true);
            }}
            className="h-8 w-8 rounded-full flex items-center justify-center text-base text-muted-foreground hover:bg-muted transition-colors"
            title={t("moreReactions")}
          >
            +
          </button>
        )}
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
  hideOthers = false,
}: CommonProps & {
  /** Groups: others' reactions live in the Bar under the bubble instead. */
  hideOthers?: boolean;
}) {
  const toggle = useToggleReaction(type);

  // Group others' reactions (everyone except me) by emoji.
  const others = new Map<string, number>();
  for (const r of reactions) {
    if (hideOthers) break;
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
