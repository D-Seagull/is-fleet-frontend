"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useTranslations } from "next-intl";

export interface GalleryPhoto {
  id: string;
  signedUrl: string;
}

// How far (px) a drag must travel to flip to the neighbouring photo.
const SWIPE_THRESHOLD = 60;
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_CLICK_SCALE = 2.5;

/** Zoom + pan of the open photo: `translate(x, y) scale(s)`. */
interface View {
  s: number;
  x: number;
  y: number;
}
const RESET: View = { s: 1, x: 0, y: 0 };

/**
 * Full-screen photo gallery: every photo of a chat, opened at the one the
 * user clicked.
 *  - flip: ‹ › buttons, ← → keys, drag / swipe sideways;
 *  - zoom: mouse wheel and double-click (towards the pointer), pinch on touch,
 *    + / − / 0 keys; a zoomed photo is dragged around instead of flipped;
 *  - close: Esc, ✕, click on the backdrop.
 * Pointer events, so mouse, touch and pen all work.
 *
 * Renders nothing while `startIndex` is null, so the parent drives it with a
 * plain `useState<number | null>`. How to download is the caller's call
 * (trip / DM / group documents use different endpoints) — hence `onDownload`.
 */
export function PhotoGallery({
  photos,
  startIndex,
  onClose,
  onDownload,
}: {
  photos: GalleryPhoto[];
  startIndex: number | null;
  onClose: () => void;
  onDownload?: (photo: GalleryPhoto) => void;
}) {
  const tActions = useTranslations("common.actions");
  const [index, setIndex] = useState(startIndex ?? 0);
  const [view, setView] = useState<View>(RESET);
  // Horizontal offset while swiping (not zoomed) — the photo follows the pointer.
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const open = startIndex !== null && photos.length > 0;

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // Active pointers (1 = drag, 2 = pinch) and what the gesture started from.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { kind: "swipe"; startX: number }
    | { kind: "pan"; startX: number; startY: number; from: View }
    | { kind: "pinch"; startDist: number; from: View }
    | null
  >(null);
  // A drag / pinch ends with a `click` too — it must not close the gallery.
  const suppressClick = useRef(false);
  // Where the pointer went down — capture starts only once it really moves.
  const downAt = useRef<{ x: number; y: number } | null>(null);

  // Re-opening on another photo starts there, unzoomed. Adjusted during render
  // (React's "store the previous prop" pattern) rather than in an effect, so
  // there's no extra render showing the old photo first.
  const [prevStart, setPrevStart] = useState(startIndex);
  if (startIndex !== prevStart) {
    setPrevStart(startIndex);
    if (startIndex !== null) {
      setIndex(startIndex);
      setView(RESET);
    }
  }

  /** Keep a zoomed photo from sliding off: pan only within its own box. */
  const clampView = (v: View): View => {
    const img = imgRef.current;
    if (!img || v.s <= 1) return RESET;
    const maxX = (img.offsetWidth * (v.s - 1)) / 2;
    const maxY = (img.offsetHeight * (v.s - 1)) / 2;
    return {
      s: v.s,
      x: Math.max(-maxX, Math.min(maxX, v.x)),
      y: Math.max(-maxY, Math.min(maxY, v.y)),
    };
  };

  /**
   * Zoom to `scale`, keeping the point (px, py) — relative to the screen
   * centre, where the photo sits — fixed under the pointer:
   *   x' = p − s' · (p − x) / s
   */
  const zoomAt = (v: View, scale: number, px: number, py: number): View => {
    const s = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    if (s === 1) return RESET;
    return clampView({
      s,
      x: px - (s * (px - v.x)) / v.s,
      y: py - (s * (py - v.y)) / v.s,
    });
  };

  // Pointer position relative to the screen centre (the photo's centre).
  const fromCentre = (clientX: number, clientY: number) => ({
    px: clientX - window.innerWidth / 2,
    py: clientY - window.innerHeight / 2,
  });

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(photos.length - 1, i)));
    setView(RESET);
    setDragX(0);
  };
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  // Keyboard: ← → flip, + − 0 zoom, Esc close. Only while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const step = e.key === "ArrowLeft" ? -1 : 1;
        setIndex((i) => Math.max(0, Math.min(photos.length - 1, i + step)));
        setView(RESET);
      } else if (e.key === "+" || e.key === "=") {
        setView((v) => zoomAt(v, v.s * 1.25, 0, 0));
      } else if (e.key === "-") {
        setView((v) => zoomAt(v, v.s / 1.25, 0, 0));
      } else if (e.key === "0") {
        setView(RESET);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // zoomAt only reads refs / its arguments.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, photos.length, onClose]);

  // Mouse wheel zoom. Attached natively with passive:false — React's onWheel
  // is passive, so it couldn't stop the chat behind from scrolling.
  useEffect(() => {
    const el = containerRef.current;
    if (!open || !el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { px, py } = fromCentre(e.clientX, e.clientY);
      // Smooth for trackpads, ~15% per mouse-wheel notch.
      const factor = Math.exp(-e.deltaY * 0.0015);
      setView((v) => zoomAt(v, v.s * factor, px, py));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;
  // A photo may have been deleted while the gallery was open.
  const photo = photos[Math.min(index, photos.length - 1)];

  const pinchDistance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    // Buttons (‹ › ✕ Download) keep their own clicks.
    if ((e.target as HTMLElement).closest("button")) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    downAt.current = { x: e.clientX, y: e.clientY };
    // A new press: a stale "ignore the click" from a drag that produced no
    // click must not swallow this one.
    if (pointers.current.size === 1) suppressClick.current = false;
    setDragging(true);
    if (pointers.current.size === 2) {
      setDragX(0);
      gesture.current = { kind: "pinch", startDist: pinchDistance(), from: view };
    } else if (pointers.current.size === 1) {
      gesture.current =
        view.s > 1
          ? { kind: "pan", startX: e.clientX, startY: e.clientY, from: view }
          : { kind: "swipe", startX: e.clientX };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // Capture only once a real drag starts (> 5 px). Capturing on pointerdown
    // retargets the following `click` / `dblclick` to the backdrop — a click
    // on the photo then closed the gallery and double-click never zoomed.
    const start = downAt.current;
    if (
      start &&
      !e.currentTarget.hasPointerCapture(e.pointerId) &&
      Math.abs(e.clientX - start.x) + Math.abs(e.clientY - start.y) > 5
    ) {
      e.currentTarget.setPointerCapture(e.pointerId);
      suppressClick.current = true;
    }
    const g = gesture.current;
    if (!g) return;
    if (g.kind === "pinch" && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const { px, py } = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      setView(zoomAt(g.from, (g.from.s * pinchDistance()) / g.startDist, px, py));
      suppressClick.current = true;
    } else if (g.kind === "pan") {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      if (Math.abs(dx) + Math.abs(dy) > 5) suppressClick.current = true;
      setView(clampView({ s: g.from.s, x: g.from.x + dx, y: g.from.y + dy }));
    } else if (g.kind === "swipe") {
      setDragX(e.clientX - g.startX);
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size === 0) downAt.current = null;
    const g = gesture.current;
    if (pointers.current.size > 0) {
      // One finger lifted after a pinch — wait for the other; no swipe.
      gesture.current = null;
      return;
    }
    gesture.current = null;
    setDragging(false);
    if (g?.kind === "swipe") {
      const dx = dragX;
      setDragX(0); // snaps back (animated) unless we flip below
      if (Math.abs(dx) > 5) suppressClick.current = true;
      if (dx <= -SWIPE_THRESHOLD && hasNext) goTo(index + 1);
      else if (dx >= SWIPE_THRESHOLD && hasPrev) goTo(index - 1);
    }
  };

  // Portal into <body>: the gallery covers the whole screen no matter where
  // it's mounted — a tab's overflow / stacking context / transform can't
  // clip or hide it.
  return createPortal(
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/90 select-none touch-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        onClose();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        key={photo.id}
        src={photo.signedUrl}
        alt=""
        className={`max-h-[85vh] max-w-[85vw] rounded-lg object-contain ${
          dragging ? "" : "transition-transform duration-150"
        }`}
        style={{
          transform: `translate(${view.x + dragX}px, ${view.y}px) scale(${view.s})`,
        }}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => {
          e.stopPropagation();
          const { px, py } = fromCentre(e.clientX, e.clientY);
          setView((v) =>
            v.s > 1 ? RESET : zoomAt(v, DOUBLE_CLICK_SCALE, px, py),
          );
        }}
        draggable={false}
      />

      {/* Controls sit above the photo so a zoomed photo never covers them. */}
      <div className="absolute top-4 left-4 text-sm text-white/80">
        {index + 1} / {photos.length}
      </div>
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white"
        onClick={onClose}
        aria-label="close"
      >
        <X className="h-6 w-6" />
      </button>

      {hasPrev && (
        <button
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
          onClick={(e) => {
            e.stopPropagation();
            goTo(index - 1);
          }}
          aria-label="previous"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
      )}
      {hasNext && (
        <button
          className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/25"
          onClick={(e) => {
            e.stopPropagation();
            goTo(index + 1);
          }}
          aria-label="next"
        >
          <ChevronRight className="h-7 w-7" />
        </button>
      )}

      {onDownload && (
        <div className="absolute bottom-4 flex gap-2">
          <button
            className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/30"
            onClick={(e) => {
              e.stopPropagation();
              onDownload(photo);
            }}
          >
            <Download className="h-4 w-4" /> {tActions("download")}
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
