"use client";

import { useEffect } from "react";

/**
 * Unread counter on the desktop shell's Windows taskbar button — the red
 * circle overlay in the icon's corner (Windows has no numeric badge API;
 * Tauri's setBadgeCount is macOS/Linux only). The circle is drawn here on a
 * canvas and handed to `setOverlayIcon`.
 *
 * Needs `core:window:allow-set-overlay-icon` in the shell's capabilities;
 * older shells without it just reject and we ignore that. No-op in a
 * regular browser.
 */

type TauriApi = {
  window?: {
    getCurrentWindow: () => {
      setOverlayIcon: (icon?: unknown) => Promise<void>;
    };
  };
  image?: {
    Image: {
      new: (rgba: Uint8Array, width: number, height: number) => Promise<unknown>;
    };
  };
};

function tauri(): TauriApi | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __TAURI__?: TauriApi }).__TAURI__ ?? null;
}

// Overlay is shown at 16 logical px; draw at 2x for HiDPI screens.
const SIZE = 32;

function drawBadge(count: number): Uint8Array | null {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = "#E11D48";
  ctx.beginPath();
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2);
  ctx.fill();

  const label = count > 99 ? "99+" : String(count);
  const fontSize = label.length === 1 ? 22 : label.length === 2 ? 18 : 13;
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, SIZE / 2, SIZE / 2 + 1);

  return new Uint8Array(ctx.getImageData(0, 0, SIZE, SIZE).data.buffer);
}

let lastCount = -1;
// Serialize calls so a quick 3 → 0 can't land out of order.
let queue: Promise<void> = Promise.resolve();

export function setTaskbarBadge(count: number) {
  const api = tauri();
  if (!api?.window || !api.image) return;
  const n = Math.max(0, Math.floor(count));
  if (n === lastCount) return;
  lastCount = n;

  queue = queue.then(async () => {
    try {
      const win = api.window!.getCurrentWindow();
      if (n === 0) {
        await win.setOverlayIcon(undefined);
        return;
      }
      const rgba = drawBadge(n);
      if (!rgba) return;
      const icon = await api.image!.Image.new(rgba, SIZE, SIZE);
      await win.setOverlayIcon(icon);
    } catch {
      // Shell without the permission / non-Windows — nothing to show.
    }
  });
}

/** Keep the taskbar badge in sync with `count`; clears it on unmount (logout). */
export function useTaskbarBadge(count: number) {
  useEffect(() => {
    setTaskbarBadge(count);
  }, [count]);
  useEffect(() => () => setTaskbarBadge(0), []);
}
