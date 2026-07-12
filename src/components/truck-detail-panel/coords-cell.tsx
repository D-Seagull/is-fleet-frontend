"use client";

import { Navigation, Copy, ExternalLink } from "lucide-react";

export function CoordsCell({ coords }: { coords: string }) {
  function copy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(coords);
  }
  return (
    <span className="flex items-center gap-1">
      <Navigation className="h-3 w-3 shrink-0" />
      {coords}
      <button
        onClick={copy}
        className="hover:text-foreground transition-colors"
        title="Copy"
      >
        <Copy className="h-3 w-3" />
      </button>
      <a
        href={`https://www.google.com/maps?q=${coords}`}
        target="_blank"
        rel="noreferrer"
        className="hover:text-foreground transition-colors"
        title="Open in Google Maps"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3 w-3" />
      </a>
    </span>
  );
}
