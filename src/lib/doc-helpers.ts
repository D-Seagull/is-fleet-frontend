/**
 * Signed URL for a file. Goes through the shared axios client (not a raw
 * `fetch`) so an expired access token is refreshed and the request replayed:
 * with a plain fetch a 401 came back as "failed to download" and only a page
 * reload (which refreshes the token) cured it.
 */
export async function fetchSignedUrl(endpoint: string): Promise<string | null> {
  const { api } = await import("@/lib/api");
  try {
    const res = await api.get<{ url?: string }>(endpoint);
    return res.data?.url ?? null;
  } catch {
    return null;
  }
}

// Extensions the in-app viewer can render inline (<img> or <iframe>). Anything
// else (Office docs, archives…) we hand to the browser in a new tab.
const PREVIEWABLE_RE = /\.(pdf|png|jpe?g|gif|webp|bmp|svg|avif)(\?|$)/i;

// Show a signed file URL in the global in-app viewer. We deliberately do NOT
// navigate the browser to the raw URL: desktop browsers download PDFs (the
// "Download PDFs instead of opening" setting) and can't render HEIC at all, so
// the file "only downloads". An embedded <iframe>/<img> previews it reliably.
export async function openUrlInViewer(url: string, fileName?: string | null) {
  if (!PREVIEWABLE_RE.test(url.split("?")[0])) {
    window.open(url, "_blank");
    return;
  }
  const { useDocViewer } = await import("@/store/doc-viewer");
  useDocViewer.getState().open(url, fileName ?? null);
}

export async function openDoc(docId: string, fileName?: string | null) {
  const url = await fetchSignedUrl(`/documents/${docId}/view`);
  if (!url) return;
  await openUrlInViewer(url, fileName);
}

// ── Download progress for the UI (components/download-status.tsx) ───────
// Helpers announce phases as a window event; the component turns them (and
// the desktop shell's own download events) into one morphing toast.
export const DOWNLOAD_EVENT = "isfleet:download";
export type DownloadPhase = "preparing" | "navigated" | "failed";

function announce(phase: DownloadPhase) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DOWNLOAD_EVENT, { detail: phase }));
}

/** Fetch the attachment URL and navigate to it — downloads in place. */
async function startDownload(endpoint: string) {
  announce("preparing");
  const url = await fetchSignedUrl(endpoint).catch(() => null);
  if (!url) {
    announce("failed");
    return;
  }
  window.location.href = url;
  announce("navigated");
}

export async function downloadDoc(docId: string) {
  await startDownload(`/documents/${docId}/download`);
}

/**
 * Download a DM / group chat file (their own endpoints, not /documents).
 * The signed URL carries `Content-Disposition: attachment`, so navigating to
 * it downloads in place — the browser saves it, the desktop shell routes it
 * to Downloads. (`window.open` did nothing in the desktop shell.)
 */
export async function downloadChatDoc(source: "dm" | "group", docId: string) {
  const base =
    source === "dm" ? "/direct-messages/documents" : "/group-messages/documents";
  await startDownload(`${base}/${docId}/download`);
}
