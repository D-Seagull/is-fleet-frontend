import { create } from "zustand";

// Drives the global in-app file viewer (see components/doc-viewer-modal.tsx).
// We preview files inside the app instead of navigating the browser to the raw
// file URL, because desktop browsers download PDFs (the "Download PDFs instead
// of opening" setting) and can't render HEIC at all — an embedded <iframe>/<img>
// shows both reliably regardless of browser settings.
interface DocViewerState {
  url: string | null;
  fileName: string | null;
  open: (url: string, fileName?: string | null) => void;
  close: () => void;
}

export const useDocViewer = create<DocViewerState>((set) => ({
  url: null,
  fileName: null,
  open: (url, fileName) => set({ url, fileName: fileName ?? null }),
  close: () => set({ url: null, fileName: null }),
}));
