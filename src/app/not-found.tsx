import Link from "next/link";
import { Button } from "@/components/ui/button";

// 404 — a truck parked at the end of a road that just stops. Uses
// currentColor throughout so the illustration adapts to light / dark.
export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 text-center">
      <svg
        viewBox="0 0 240 120"
        className="w-64 h-32 text-foreground"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {/* Trailer */}
        <rect x="30" y="42" width="70" height="42" rx="3" />
        {/* Cab */}
        <path d="M100 52 h20 l10 12 v20 h-30 Z" />
        {/* Windshield */}
        <path d="M113 55 h13 l6 8 h-19 Z" fill="currentColor" opacity="0.15" />
        {/* Wheels */}
        <circle cx="52" cy="86" r="6" />
        <circle cx="90" cy="86" r="6" />
        <circle cx="118" cy="86" r="6" />
        {/* Road — solid under the truck, then abruptly stops */}
        <line x1="10" y1="98" x2="145" y2="98" />
        {/* Short vertical marker showing the road ends */}
        <line x1="145" y1="94" x2="145" y2="102" opacity="0.7" />
        {/* Beyond the edge — sparse dots hint at nothingness */}
        <circle cx="165" cy="98" r="0.8" fill="currentColor" opacity="0.4" />
        <circle cx="180" cy="98" r="0.8" fill="currentColor" opacity="0.3" />
        <circle cx="195" cy="98" r="0.8" fill="currentColor" opacity="0.2" />
      </svg>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">404</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Road ends here. The page you were looking for doesn&apos;t exist
          or has been moved.
        </p>
      </div>

      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </main>
  );
}
