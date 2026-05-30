"use client";

import { cn } from "@/lib/utils";

interface Props {
  senderName: string | null;
  content: string;
  isDeleted?: boolean;
  /** Click handler — typically scrolls to the original message. */
  onClick?: () => void;
  /** Tweaks colour for use inside the user's own (primary) bubble. */
  variant?: "default" | "onPrimary";
}

/**
 * Telegram/Viber-style reply quote shown above a message's content. A
 * vertical accent line on the left, the original sender's name on top,
 * and a one-line preview of the original message below.
 */
export function MessageQuote({
  senderName,
  content,
  isDeleted = false,
  onClick,
  variant = "default",
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full text-left rounded-md pl-2 py-1 mb-1 border-l-2 transition-colors",
        variant === "onPrimary"
          ? "border-primary-foreground/60 bg-primary-foreground/10 hover:bg-primary-foreground/20"
          : "border-primary bg-primary/10 hover:bg-primary/15",
        onClick && "cursor-pointer",
        !onClick && "cursor-default",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold leading-tight",
          variant === "onPrimary"
            ? "text-primary-foreground/90"
            : "text-primary",
        )}
      >
        {senderName ?? "Unknown"}
      </p>
      <p
        className={cn(
          "text-[11px] leading-tight truncate",
          isDeleted && "italic",
          variant === "onPrimary"
            ? "text-primary-foreground/70"
            : "text-muted-foreground",
        )}
      >
        {isDeleted ? "Повідомлення видалено" : content}
      </p>
    </button>
  );
}
