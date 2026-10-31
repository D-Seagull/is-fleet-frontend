import { Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { TONE_CLASS } from "@/lib/status-tone";

/** A truck note ("change the batteries") as an amber chip with a wrench. */
export function IssueChip({
  children,
  className,
  ...props
}: React.ComponentProps<"span">) {
  // Spreads the rest so it can sit under a Radix `asChild` trigger.
  return (
    <span
      {...props}
      className={cn(
        "inline-flex h-6 max-w-full items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold",
        TONE_CLASS.warn,
        className,
      )}
    >
      <Wrench className="h-[13px] w-[13px] shrink-0" />
      <span className="truncate">{children}</span>
    </span>
  );
}
