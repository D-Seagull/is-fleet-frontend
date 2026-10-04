"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { DOWNLOAD_EVENT, type DownloadPhase } from "@/lib/doc-helpers";

/** Payload of the desktop shell's `download-started` / `download-finished`. */
interface ShellDownload {
  id: string;
  name: string;
  path: string | null;
  success: boolean;
}

type TauriApi = {
  core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
  event?: {
    listen: (
      event: string,
      handler: (e: { payload: ShellDownload }) => void,
    ) => Promise<() => void>;
  };
};

// One toast that morphs: preparing → downloading → saved / failed.
const TOAST_ID = "download";

/**
 * Shows what a download is doing, so a click on "Download" visibly does
 * something:
 *  - "Preparing file…" while the signed URL is fetched (lib/doc-helpers);
 *  - desktop shell: "Downloading <name>" → "Saved" with "Show in folder",
 *    from the shell's download events;
 *  - browser: "Download started" (the browser's own bar shows progress).
 * Renders nothing itself.
 */
export function DownloadStatus() {
  const t = useTranslations("common.download");
  // Set once the desktop shell reports the transfer itself.
  const shellTookOver = useRef(false);

  // Phases announced by the download helpers.
  useEffect(() => {
    const isShell = "__TAURI__" in window;
    let fallback: ReturnType<typeof setTimeout> | undefined;
    const started = () =>
      toast.success(t("started"), { id: TOAST_ID, duration: 2500 });

    const onPhase = (e: Event) => {
      const phase = (e as CustomEvent<DownloadPhase>).detail;
      if (phase === "preparing") {
        shellTookOver.current = false;
        toast.loading(t("preparing"), { id: TOAST_ID });
      } else if (phase === "navigated") {
        // Browser: its own download bar takes over. Desktop: wait for the
        // shell's events — an older shell (< 0.2.4) sends none, so fall
        // back after a moment instead of spinning forever.
        if (!isShell) started();
        else {
          clearTimeout(fallback);
          fallback = setTimeout(() => {
            if (!shellTookOver.current) started();
          }, 4000);
        }
      } else if (phase === "failed") {
        toast.error(t("failed"), { id: TOAST_ID });
      }
    };
    window.addEventListener(DOWNLOAD_EVENT, onPhase);
    return () => {
      clearTimeout(fallback);
      window.removeEventListener(DOWNLOAD_EVENT, onPhase);
    };
  }, [t]);

  // Desktop shell: real start / finish of the file transfer.
  useEffect(() => {
    const tauri = (window as unknown as { __TAURI__?: TauriApi }).__TAURI__;
    if (!tauri?.event) return;
    const unlisten: Array<() => void> = [];
    let cancelled = false;

    const track = (p: Promise<() => void>) =>
      p
        .then((off) => (cancelled ? off() : unlisten.push(off)))
        .catch(() => {});

    track(
      tauri.event.listen("download-started", ({ payload }) => {
        shellTookOver.current = true;
        toast.loading(t("downloading", { name: payload.name }), {
          id: TOAST_ID,
        });
      }),
    );
    track(
      tauri.event.listen("download-finished", ({ payload }) => {
        shellTookOver.current = true;
        if (!payload.success) {
          toast.error(t("failed"), { id: TOAST_ID, description: payload.name });
          return;
        }
        toast.success(t("saved"), {
          id: TOAST_ID,
          description: payload.name,
          duration: 6000,
          action: payload.path
            ? {
                label: t("showInFolder"),
                onClick: () =>
                  void tauri.core
                    ?.invoke("reveal_download", { path: payload.path })
                    .catch(() => {}),
              }
            : undefined,
        });
      }),
    );

    return () => {
      cancelled = true;
      unlisten.forEach((off) => off());
    };
  }, [t]);

  return null;
}
