"use client";

/**
 * Chat pop-up notifications.
 *
 * - In a regular browser: the Web Notification API (native OS toast).
 * - Inside the Tauri desktop shell: WebView2 does NOT surface web
 *   notifications, so we route through the Tauri notification plugin instead
 *   (exposed on `window.__TAURI__.notification` via `withGlobalTauri`).
 *
 * No-ops gracefully where notifications aren't available or permission is
 * denied.
 */

type TauriNotification = {
  isPermissionGranted: () => Promise<boolean>;
  requestPermission: () => Promise<"granted" | "denied" | "default">;
  sendNotification: (
    options: { title: string; body?: string; icon?: string } | string,
  ) => void;
};

function tauriNotify(): TauriNotification | null {
  if (typeof window === "undefined") return null;
  const tauri = (
    window as unknown as { __TAURI__?: { notification?: TauriNotification } }
  ).__TAURI__;
  return tauri?.notification ?? null;
}

let primed = false;

/** Ask for notification permission up front (browser: on first gesture). */
export function primeNotifyPermission() {
  if (typeof window === "undefined") return;

  const tn = tauriNotify();
  if (tn) {
    void tn
      .isPermissionGranted()
      .then((granted) => (granted ? null : tn.requestPermission()))
      .catch(() => {});
    return;
  }

  if (!("Notification" in window) || primed) return;
  if (Notification.permission !== "default") return;
  primed = true;
  const ask = () => {
    if (Notification.permission === "default") {
      void Notification.requestPermission().catch(() => {});
    }
  };
  ask();
  window.addEventListener("pointerdown", ask, { once: true });
}

/**
 * Show a chat notification — only when the app window isn't focused, so we
 * never ping the user about a message they're already looking at.
 */
export function showMessageNotification(opts: {
  title: string;
  body: string;
  icon?: string | null;
  onClick?: () => void;
}) {
  if (typeof window === "undefined") return;
  if (typeof document !== "undefined" && document.hasFocus()) return;

  // ── Desktop shell (Tauri) ────────────────────────────────────────────
  const tn = tauriNotify();
  if (tn) {
    void (async () => {
      try {
        let granted = await tn.isPermissionGranted();
        if (!granted) granted = (await tn.requestPermission()) === "granted";
        if (granted) tn.sendNotification({ title: opts.title, body: opts.body });
      } catch {
        /* plugin call failed — ignore */
      }
    })();
    return;
  }

  // ── Browser ──────────────────────────────────────────────────────────
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  try {
    const n = new Notification(opts.title, {
      body: opts.body,
      icon: opts.icon || "/app-icon.png",
      // Same tag → a burst of messages replaces rather than stacks.
      tag: "is-fleet-message",
    });
    n.onclick = () => {
      window.focus();
      opts.onClick?.();
      n.close();
    };
  } catch {
    /* Notification constructor can throw on some platforms — ignore. */
  }
}
