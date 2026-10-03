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

/**
 * Version of the installed desktop shell (tauri.conf.json "version"), or
 * null in a regular browser. Uses `core:app:default`, already granted.
 */
export async function getDesktopVersion(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const tauri = (
    window as unknown as {
      __TAURI__?: { app?: { getVersion: () => Promise<string> } };
    }
  ).__TAURI__;
  try {
    return (await tauri?.app?.getVersion()) ?? null;
  } catch {
    return null;
  }
}

// ── Clickable desktop toasts (shell ≥ 0.2.4) ────────────────────────────
// The shell's `show_notification` command shows a Windows toast whose click
// brings the window back and emits `notification-clicked` with our id; we
// then run that notification's onClick (opens the right chat). Older shells
// don't have the command — the call rejects and we use the plugin instead.

type TauriCore = {
  core?: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> };
  event?: {
    listen: (
      event: string,
      handler: (e: { payload: unknown }) => void,
    ) => Promise<() => void>;
  };
};

function tauriCore(): TauriCore | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { __TAURI__?: TauriCore }).__TAURI__ ?? null;
}

// Pending click handlers by notification id (bounded — old toasts expire).
const clickHandlers = new Map<string, () => void>();
let clickListenerStarted = false;

function listenForToastClicks() {
  if (clickListenerStarted) return;
  const ev = tauriCore()?.event;
  if (!ev) return;
  clickListenerStarted = true;
  void ev
    .listen("notification-clicked", (e) => {
      const id = typeof e.payload === "string" ? e.payload : "";
      const handler = clickHandlers.get(id);
      clickHandlers.delete(id);
      handler?.();
    })
    .catch(() => {
      clickListenerStarted = false;
    });
}

/** true when the shell showed the toast itself (click routing works). */
async function showShellToast(opts: {
  title: string;
  body: string;
  onClick?: () => void;
}): Promise<boolean> {
  const core = tauriCore()?.core;
  if (!core) return false;
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (opts.onClick) {
    clickHandlers.set(id, opts.onClick);
    if (clickHandlers.size > 50) {
      const oldest = clickHandlers.keys().next().value;
      if (oldest) clickHandlers.delete(oldest);
    }
    listenForToastClicks();
  }
  try {
    await core.invoke("show_notification", {
      id,
      title: opts.title,
      body: opts.body,
    });
    return true;
  } catch {
    clickHandlers.delete(id);
    return false; // older shell — no such command
  }
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
      // Shell ≥ 0.2.4: clickable toast that opens this chat.
      if (await showShellToast(opts)) return;
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
      icon: opts.icon || "/icon-192.png",
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
