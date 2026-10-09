"use client";

import { UploadProgress } from "@/components/upload-progress";
import { stableKey, uploadProgress } from "@/lib/outbox";
import { cn } from "@/lib/utils";

export interface AlbumPhoto {
  id: string;
  signedUrl: string;
  thumbUrl?: string | null;
  fileName: string;
}

// Tiles shown at most; the last one carries "+N" for the rest.
const MAX_TILES = 4;

/**
 * Photo grid of an album bubble (Telegram / Viber style):
 *   1 → the photo alone · 2 → side by side · 3 → one tall + two stacked ·
 *   4+ → 2×2, the 4th tile dimmed with "+N" for the photos not shown.
 * Every tile — "+N" included — opens the gallery at that photo.
 * `anchorId` gives each tile the DOM id that reply quotes scroll to.
 */
export function AlbumGrid({
  photos,
  onOpen,
  onImageLoaded,
  anchorId,
}: {
  photos: AlbumPhoto[];
  onOpen: (id: string) => void;
  onImageLoaded?: () => void;
  anchorId?: (id: string) => string | undefined;
}) {
  if (photos.length === 0) return null;

  const tile = (p: AlbumPhoto, className?: string, more = 0) => (
    <button
      key={stableKey(p.id)}
      id={anchorId?.(p.id)}
      type="button"
      onClick={() => onOpen(p.id)}
      className={cn(
        "relative block overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.thumbUrl || p.signedUrl}
        alt={p.fileName}
        // Only photos scrolled near get fetched, not the whole history's.
        loading="lazy"
        onLoad={onImageLoaded}
        className="h-full w-full object-cover block"
      />
      <UploadProgress progress={uploadProgress(p)} />
      {more > 0 && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-xl font-semibold">
          +{more}
        </span>
      )}
    </button>
  );

  if (photos.length === 1) {
    return (
      <div className="max-w-[260px]">
        {tile(photos[0], "max-h-[260px] w-full [&_img]:max-h-[260px]")}
      </div>
    );
  }

  if (photos.length === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5 w-[260px] h-[160px]">
        {photos.map((p) => tile(p))}
      </div>
    );
  }

  if (photos.length === 3) {
    return (
      <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-[260px] h-[260px]">
        {tile(photos[0], "row-span-2")}
        {tile(photos[1])}
        {tile(photos[2])}
      </div>
    );
  }

  const hidden = photos.length - MAX_TILES;
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-[260px] h-[260px]">
      {photos
        .slice(0, MAX_TILES)
        .map((p, i) => tile(p, undefined, i === MAX_TILES - 1 ? hidden : 0))}
    </div>
  );
}
