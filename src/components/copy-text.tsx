"use client";

import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Text that copies itself on click (order numbers). Stops the click from
 * reaching the row it sits in, so it doesn't also expand / open it. The text
 * stays selectable too.
 */
export function CopyText({
  value,
  children,
  className,
}: {
  value: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const tActions = useTranslations("common.actions");
  return (
    <span
      role="button"
      tabIndex={0}
      title={tActions("copy")}
      onClick={(e) => {
        e.stopPropagation();
        // The card / row around it is clickable — don't treat a text
        // selection (drag) as a copy click.
        if (window.getSelection()?.toString()) return;
        void navigator.clipboard
          ?.writeText(value)
          .then(() => toast.success(tActions("copied")))
          .catch(() => {});
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.stopPropagation();
        void navigator.clipboard?.writeText(value).then(() => toast.success(tActions("copied")));
      }}
      className={cn("cursor-copy select-text rounded hover:bg-secondary", className)}
    >
      {children ?? value}
    </span>
  );
}
