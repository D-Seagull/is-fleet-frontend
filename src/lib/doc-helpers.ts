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

export async function openDoc(docId: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  const url = await fetchSignedUrl(`/documents/${docId}/view`);
  if (!url) { win.close(); return; }
  win.location.href = url;
}

export async function downloadDoc(docId: string) {
  const url = await fetchSignedUrl(`/documents/${docId}/download`);
  if (!url) return;
  window.location.href = url;
}
