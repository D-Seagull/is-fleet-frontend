"use client";

import { Loader2 } from "lucide-react";

const R = 16;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Over a photo that is still uploading: a ring filling with the bytes sent,
 * then a spinner while the server stores it. Renders nothing for stored files
 * (`progress` undefined). The parent must be `relative`.
 */
export function UploadProgress({ progress }: { progress: number | undefined }) {
  if (progress === undefined) return null;
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/30">
      {progress >= 100 ? (
        <Loader2 className="h-8 w-8 animate-spin text-white drop-shadow" />
      ) : (
        <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90 drop-shadow">
          <circle cx="20" cy="20" r={R} fill="rgba(0,0,0,.35)" stroke="rgba(255,255,255,.35)" strokeWidth="3" />
          <circle
            cx="20"
            cy="20"
            r={R}
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - Math.max(progress, 4) / 100)}
            className="transition-[stroke-dashoffset] duration-200"
          />
        </svg>
      )}
    </span>
  );
}

/** Where ✓ goes for a sent file: a small spinner while it's uploading. */
export function UploadingTick() {
  return <Loader2 className="h-2.5 w-2.5 animate-spin" />;
}
