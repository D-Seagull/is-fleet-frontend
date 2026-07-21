"use client";

import { Paperclip } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

interface Props {
  senderName: string | null;
  /** Plain text content of the original message. Ignored when `kind === "doc"`. */
  content: string;
  isDeleted?: boolean;
  /** What kind of target this quote points to. */
  kind?: "msg" | "doc";
  /** File name (only when `kind === "doc"`). */
  fileName?: string;
  /** Click handler — typically scrolls to the original message/doc. */
  onClick?: () => void;
  /** Tweaks colour for use inside the user's own (primary) bubble. */
  variant?: "default" | "onPrimary";
}

/**
 * Telegram/Viber-style reply quote shown above a message's content. A
 * vertical accent line on the left, the original sender's name on top,
 * and a one-line preview of the original message below.
 *
 * For document quotes a 📎 icon + file name is shown instead of text.
 */
export function MessageQuote({
  senderName,
  content,
  isDeleted = false,
  kind = "msg",
  fileName,
  onClick,
  variant = "default",
}: Props) {
  const t = useTranslations("chat");
  const isDoc = kind === "doc";
  const tombstone = isDoc ? t("fileDeleted") : t("messageDeleted");

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
        {senderName ?? t("unknown")}
      </p>
      <p
        className={cn(
          "text-[11px] leading-tight truncate flex items-center gap-1",
          isDeleted && "italic",
          variant === "onPrimary"
            ? "text-primary-foreground/70"
            : "text-muted-foreground",
        )}
      >
        {isDoc && !isDeleted && <Paperclip className="h-3 w-3 shrink-0" />}
        <span className="truncate">
          {isDeleted ? tombstone : isDoc ? (fileName ?? "Файл") : content}
        </span>
      </p>
    </button>
  );
}
