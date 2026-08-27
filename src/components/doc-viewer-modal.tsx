"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDocViewer } from "@/store/doc-viewer";

const IMG_RE = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i;

// Global full-screen file preview. Renders images with <img> (contained) and
// everything else (PDF) with an <iframe>. Embedded PDFs render inline in every
// major desktop browser even when "Download PDFs instead of opening" is on,
// which is why we no longer navigate the tab to the raw file URL.
export function DocViewerModal() {
  const t = useTranslations("common.actions");
  const url = useDocViewer((s) => s.url);
  const fileName = useDocViewer((s) => s.fileName);
  const close = useDocViewer((s) => s.close);

  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [url, close]);

  if (!url) return null;

  const isImg = IMG_RE.test(url.split("?")[0]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/90"
      onClick={close}
    >
      <div
        className="flex items-center justify-between gap-2 px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="truncate text-sm text-white/80">{fileName ?? ""}</span>
        <div className="flex items-center gap-1">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/25"
          >
            <ExternalLink className="h-4 w-4" /> {t("openInNewTab")}
          </a>
          <button
            className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white"
            onClick={close}
            aria-label={t("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        className="min-h-0 flex-1 px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        {isImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={fileName ?? "preview"}
            className="h-full w-full rounded-lg object-contain"
          />
        ) : (
          <iframe
            src={url}
            title={fileName ?? "document"}
            className="h-full w-full rounded-lg border-0 bg-white"
          />
        )}
      </div>
    </div>
  );
}
