export async function fetchSignedUrl(endpoint: string): Promise<string | null> {
  const { useAuthStore } = await import("@/store/auth");
  const token = useAuthStore.getState().token;
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const res = await fetch(`${base}${endpoint}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { url: string };
  return data.url;
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

export async function downloadDoc(docId: string) {
  const url = await fetchSignedUrl(`/documents/${docId}/download`);
  if (!url) return;
  window.location.href = url;
}
