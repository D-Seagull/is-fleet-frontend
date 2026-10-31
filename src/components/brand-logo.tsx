import { cn } from "@/lib/utils";

/**
 * IS Fleet wordmark. Renders the dark-text lockup in light theme and the
 * white one in dark. SVG, so it stays crisp at any height and weighs a few
 * kilobytes; plain <img> because next/image's optimizer choked on the old
 * PNGs and buys nothing for vector. Pass a height utility (e.g. `h-12`).
 */
export function BrandLogo({
  className,
  onDark = false,
}: {
  className?: string;
  /** Always the white lockup — for dark surfaces like the nav rail. */
  onDark?: boolean;
}) {
  if (onDark) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/logo-light.svg"
        alt="IS Fleet"
        className={cn("block w-auto max-w-none object-contain", className)}
      />
    );
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.svg"
        alt="IS Fleet"
        className={cn("block w-auto object-contain dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-light.svg"
        alt="IS Fleet"
        className={cn("hidden w-auto object-contain dark:block", className)}
      />
    </>
  );
}
