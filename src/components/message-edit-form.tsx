"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  /** Original text to seed the textarea with. */
  initial: string;
  /** Called when the user saves (trimmed text guaranteed non-empty). */
  onSave: (content: string) => void | Promise<void>;
  /** Called on Esc / X click / blur outside, no save. */
  onCancel: () => void;
  /** Tweaks colour for use inside the user's own (primary) bubble. */
  variant?: "default" | "onPrimary";
}

/**
 * Inline edit form rendered in place of a message bubble's text.
 *  - Enter (no shift) saves; Shift+Enter inserts newline.
 *  - Escape cancels.
 *  - Save is disabled while the trimmed text is empty or unchanged.
 */
export function MessageEditForm({ initial, onSave, onCancel, variant = "default" }: Props) {
  const t = useTranslations("common.actions");
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Focus + place caret at end on mount.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

  const trimmed = value.trim();
  const canSave = !!trimmed && trimmed !== initial.trim() && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    try {
      setSaving(true);
      await onSave(trimmed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSave();
          }
        }}
        rows={Math.min(6, Math.max(1, value.split("\n").length))}
        className={
          variant === "onPrimary"
            ? "min-h-[2rem] resize-none text-sm bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:ring-primary-foreground/40"
            : "min-h-[2rem] resize-none text-sm"
        }
      />
      <div className="flex items-center justify-end gap-1">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onCancel}
          disabled={saving}
          className={
            variant === "onPrimary"
              ? "h-7 px-2 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              : "h-7 px-2"
          }
        >
          <X className="h-3.5 w-3.5 mr-1" />
          {t("cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className={
            variant === "onPrimary"
              ? "h-7 px-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              : "h-7 px-2"
          }
        >
          <Check className="h-3.5 w-3.5 mr-1" />
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
