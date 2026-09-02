import { api } from "@/lib/api";

/**
 * Which client filed the report. The desktop shell is the same web bundle
 * wrapped in Tauri, so we detect the Tauri global to tell them apart.
 */
function detectAppName(): "web" | "desktop" {
  if (typeof window !== "undefined" && "__TAURI__" in window) return "desktop";
  return "web";
}

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0";

export interface BugReportContext {
  /** The route the user was on when they opened the reporter. */
  route?: string;
}

/**
 * Files a bug report. Auto-captures client context (app, version, platform,
 * route) alongside the free-text description and any screenshots, then POSTs
 * as multipart to the backend, which stores it and pings admins in real time.
 */
export async function reportBug(
  description: string,
  screenshots: File[],
  ctx: BugReportContext = {},
): Promise<void> {
  const form = new FormData();
  form.append("description", description);
  form.append("appName", detectAppName());
  form.append("appVersion", APP_VERSION);
  if (typeof navigator !== "undefined") {
    form.append("platform", navigator.userAgent.slice(0, 120));
  }
  if (ctx.route) form.append("route", ctx.route);
  for (const file of screenshots) {
    form.append("screenshots", file);
  }

  await api.post("/bug-reports", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
}
