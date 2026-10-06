// Files that can go into a chat — same set as the paperclip picker, and the
// backend takes up to MAX_CHAT_FILES per upload.
export const CHAT_FILE_ACCEPT = "image/*,.pdf,.doc,.docx,.xls,.xlsx";
export const MAX_CHAT_FILES = 10;

const DOC_EXT = /\.(pdf|docx?|xlsx?)$/i;

export function isChatFile(file: File): boolean {
  return file.type.startsWith("image/") || DOC_EXT.test(file.name);
}

// A pasted screenshot arrives as "image.png" — give it a name that still
// means something in the chat's attachment list and in Downloads.
const GENERIC_PASTE_NAME = /^image\.(png|jpe?g|gif|webp|bmp)$/i;

function screenshotName(ext: string, at: Date, index: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${at.getFullYear()}-${p(at.getMonth() + 1)}-${p(at.getDate())}-${p(at.getHours())}-${p(at.getMinutes())}-${p(at.getSeconds())}`;
  return `screenshot-${stamp}${index ? `-${index + 1}` : ""}.${ext.toLowerCase()}`;
}

/**
 * Chat-ready files from a paste / drop / picker: unsupported types dropped,
 * pasted screenshots renamed. Empty when there's nothing to attach (e.g. a
 * plain-text paste) — callers then let the browser do its default.
 */
export function chatFilesFrom(
  list: FileList | File[] | null | undefined,
  now: Date = new Date(),
): File[] {
  const files = Array.from(list ?? []).filter(isChatFile);
  return files.map((f, i) => {
    const m = GENERIC_PASTE_NAME.exec(f.name);
    return m
      ? new File([f], screenshotName(m[1], now, i), {
          type: f.type,
          lastModified: f.lastModified,
        })
      : f;
  });
}

/** Append to a staged queue, capped at MAX_CHAT_FILES. */
export function addToQueue(queue: File[], incoming: File[]): File[] {
  return [...queue, ...incoming].slice(0, MAX_CHAT_FILES);
}
