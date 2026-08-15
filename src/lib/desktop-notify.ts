"use client";

/**
 * Thin wrapper over the Web Notification API for chat pop-ups. Works in a
 * regular browser and inside the Tauri desktop shell (WebView2 surfaces these
 * as native Windows toasts). No-ops gracefully where notifications aren't
 * available or permission is denied.
 */

let primed = false;

/**
 * Ask for notification permission. Tries immediately (WebView2 / permissive
 * browsers allow it) and, if the browser still requires a user gesture, again
 * on the first pointer interaction. Safe to call repeatedly.
 */
export function primeNotifyPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (primed || Notification.permission !== "default") return;
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
 * Show a chat notification — but only when the app window isn't focused, so we
 * never ping the user about a message they're already looking at.
 */
export function showMessageNotification(opts: {
  title: string;
  body: string;
  icon?: string | null;
  onClick?: () => void;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.hasFocus()) return;

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
