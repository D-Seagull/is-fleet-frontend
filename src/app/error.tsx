"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// 500 — Next.js segment error boundary. Ships a wavy road that snaps in
// half in front of a moving truck: something upstream (API / DB / socket)
// stopped answering. `reset()` retries the failed render; the Home link
// is a hard escape hatch when the page itself is toast.
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console so devs can grab it during triage;
    // the on-page copy stays generic.
    console.error("[error boundary]", error);
  }, [error]);

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
        {/* Wavy road on the left side, up to the break */}
        <path d="M10 82 Q 30 68 50 82 T 90 82 T 130 82" />
        {/* Truck riding the last crest */}
        {/* Trailer */}
        <rect x="60" y="46" width="42" height="26" rx="2" />
        {/* Cab */}
        <path d="M102 54 h12 l6 8 v10 h-18 Z" />
        {/* Wheels */}
        <circle cx="72" cy="76" r="5" />
        <circle cx="96" cy="76" r="5" />
        <circle cx="114" cy="76" r="5" />
        {/* Break marker — the road ends abruptly with a jagged edge */}
        <path d="M130 82 l3 -4 l4 6 l3 -4 l3 6" opacity="0.7" />
        {/* Gap — nothing here */}
        {/* Road resumes far to the right, faded */}
        <path
          d="M180 82 Q 200 74 220 82 T 235 82"
          opacity="0.35"
          strokeDasharray="3 4"
        />
      </svg>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">500</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Connection lost. Something on our side stopped responding.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => reset()}>
          Try again
        </Button>
        <Button asChild>
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </main>
  );
}
