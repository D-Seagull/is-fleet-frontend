"use client";

import * as React from "react";
import { Paperclip, X } from "lucide-react";

import { cn } from "@/lib/utils";

// Preview of a staged image. The object URL is made and revoked in the same
// effect (and set straight on the <img>), so StrictMode's double-run can't
// leave the tile pointing at an already-revoked URL.
export function ImageThumb({ file }: { file: File }) {
  const ref = React.useRef<HTMLImageElement>(null);
  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // eslint-disable-next-line @next/next/no-img-element -- local blob preview
  return <img ref={ref} alt={file.name} className="h-full w-full object-cover" />;
}

/**
 * Files staged in a chat composer (pasted / dropped), sent with the next
 * Send. Images show as thumbnails, other files as name chips.
 */
export function PendingFiles({
  files,
  onRemove,
  removeLabel,
  className,
}: {
  files: File[];
  onRemove: (index: number) => void;
  removeLabel: string;
  className?: string;
}) {
  if (!files.length) return null;
  return (
    <div className={cn("flex flex-wrap items-end gap-1.5", className)}>
      {files.map((f, i) =>
        f.type.startsWith("image/") ? (
          <div
            key={`${f.name}-${f.lastModified}-${i}`}
            title={f.name}
            className="relative h-16 w-16 overflow-hidden rounded-md border bg-muted"
          >
            <ImageThumb file={f} />
            <button
              type="button"
              onClick={() => onRemove(i)}
              title={removeLabel}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            key={`${f.name}-${f.lastModified}-${i}`}
            className="flex max-w-[200px] items-center gap-1.5 rounded-md border bg-muted/50 px-2 py-1 text-xs"
          >
            <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="truncate">{f.name}</span>
            <button
              type="button"
              onClick={() => onRemove(i)}
              title={removeLabel}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ),
      )}
    </div>
  );
}
