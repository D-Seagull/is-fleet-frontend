"use client";

import { X, Download } from "lucide-react";
import { downloadDoc } from "@/lib/doc-helpers";

// Full-screen photo overlay for previewing an inline chat attachment.
// Renders nothing when `item` is null so the parent can drive it with a
// simple useState<{id, signedUrl} | null>.
export function ChatLightbox({
  item,
  onClose,
}: {
  item: { id: string; signedUrl: string } | null;
  onClose: () => void;
}) {
  if (!item) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.signedUrl}
        alt="preview"
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="absolute bottom-4 flex gap-2">
        <button
          className="flex items-center gap-1.5 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-white text-sm transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            downloadDoc(item.id);
          }}
        >
          <Download className="h-4 w-4" /> Download
        </button>
      </div>
    </div>
  );
}
