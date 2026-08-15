import { cn } from "@/lib/utils";

/**
 * IS Fleet wordmark. Renders the colored logo in light theme and the white
 * variant in dark. Plain <img> on purpose — next/image's optimizer choked on
 * these PNGs. Pass a height utility (e.g. `h-12`) via `className`.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/IS_logo.png"
        alt="iSfleet"
        className={cn("block w-auto object-contain dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/is_logo__white.png"
        alt="iSfleet"
        className={cn("hidden w-auto object-contain dark:block", className)}
      />
    </>
  );
}
