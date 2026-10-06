"use client";

import * as React from "react";

import { chatFilesFrom } from "@/lib/chat-files";
import { cn } from "@/lib/utils";

// Emoticons swapped for emoji as you type.
const EMOTICONS: [string, string][] = [[":)", "🙂"]];

function replaceEmoticons(s: string): string {
  let out = s;
  for (const [from, to] of EMOTICONS) out = out.split(from).join(to);
  return out;
}

// Grows with its content up to this height, then scrolls.
const MAX_HEIGHT_PX = 160;

/**
 * Chat message box shared by the trip chat and DM / group chat.
 *  - Enter sends (`onEnter`); Ctrl+Enter or Shift+Enter inserts a new line.
 *  - Auto-grows from one line up to MAX_HEIGHT_PX.
 *  - ":)" becomes 🙂 while typing (caret position kept).
 *  - Ctrl+V of a screenshot / copied file hands it to `onPasteFiles`
 *    (plain-text paste is untouched).
 */
export function ChatInput({
  value,
  onValueChange,
  onEnter,
  onKeyDown,
  onPasteFiles,
  className,
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
  onEnter: () => void;
  onPasteFiles?: (files: File[]) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const pendingCaret = React.useRef<number | null>(null);

  // Resize to content, and restore the caret after a programmatic edit
  // (emoticon swap / Ctrl+Enter), once React has committed the new value.
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT_PX ? "auto" : "hidden";
    if (pendingCaret.current !== null) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    const before = replaceEmoticons(raw.slice(0, caret));
    const next = before + replaceEmoticons(raw.slice(caret));
    if (next !== raw) pendingCaret.current = before.length;
    onValueChange(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented || e.key !== "Enter" || e.nativeEvent.isComposing) {
      return;
    }
    if (e.ctrlKey || e.metaKey) {
      // Browsers don't insert a newline on Ctrl+Enter — do it by hand.
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart ?? value.length;
      const end = el.selectionEnd ?? value.length;
      pendingCaret.current = start + 1;
      onValueChange(value.slice(0, start) + "\n" + value.slice(end));
      return;
    }
    if (e.shiftKey) return; // native newline
    e.preventDefault();
    onEnter();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!onPasteFiles) return;
    const files = chatFilesFrom(e.clipboardData?.files);
    if (!files.length) return;
    // Don't also paste the file's name / a "[image]" placeholder as text.
    e.preventDefault();
    onPasteFiles(files);
  };

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      data-slot="textarea"
      className={cn(
        "border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-9 w-full min-w-0 resize-none rounded-md border bg-transparent px-3 py-[7px] text-base leading-5 shadow-xs transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        className,
      )}
      {...props}
    />
  );
}
