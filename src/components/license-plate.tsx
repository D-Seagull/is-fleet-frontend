import { cn } from "@/lib/utils";

const PLATE_FONT =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/**
 * A truck's registration drawn as an EU number plate — white with a dark rim
 * and the blue band on the left, in dark mode too (real plates don't invert),
 * so it reads as "the truck" at a glance. No country letters on the band: the
 * plate string doesn't carry the country. Same look as the manager app.
 */
export function LicensePlate({
  plate,
  className,
}: {
  plate: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full shrink-0 items-stretch overflow-hidden rounded-[4px] border-[1.5px] border-[#1B1F26] bg-white",
        className,
      )}
    >
      <span className="w-2 shrink-0 bg-[#1E4BA8]" aria-hidden="true" />
      <span
        className="truncate px-1.5 py-px text-[13px] font-extrabold leading-snug tracking-wider text-[#1B1F26]"
        // Not `font-mono`: that is Geist Mono with no generic fallback, and
        // where the webfont isn't loaded the plate fell back to a serif face.
        style={{ fontFamily: PLATE_FONT }}
      >
        {plate}
      </span>
    </span>
  );
}
