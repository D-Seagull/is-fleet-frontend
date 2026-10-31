import { cn } from "@/lib/utils";

/**
 * A truck's registration drawn as an EU number plate — white with a dark rim
 * and the blue band on the left, in dark mode too (real plates don't invert),
 * so it reads as "the truck" at a glance. No country letters on the band: the
 * plate string doesn't carry the country. Same look as the manager app.
 */
export function LicensePlate({
  plate,
  size = "sm",
  className,
}: {
  plate: string;
  /** sm — lists on desktop; md — phone-sized cards. */
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-stretch overflow-hidden rounded-[7px] border-[1.5px] border-plate-border bg-plate-bg",
        size === "md" ? "h-[30px]" : "h-6",
        className,
      )}
    >
      <span
        className={cn("shrink-0 bg-plate-eu", size === "md" ? "w-[9px]" : "w-[7px]")}
        aria-hidden="true"
      />
      <span
        className={cn(
          "flex items-center truncate font-bold tracking-[0.06em] text-plate-fg",
          size === "md" ? "px-2 text-base" : "px-1.5 text-[13px]",
        )}
      >
        {plate}
      </span>
    </span>
  );
}
