/**
 * Telegram-style instant file send for the web chats.
 *
 * Sent files appear in the chat at once as ordinary attachment documents
 * built from the local files (blob URLs), drawn by the very same bubble
 * components. When the server answers they are swapped for the real
 * documents *in place*: same React key, same picture (the local blob keeps
 * being shown), so nothing remounts, reloads or jumps.
 *
 *  - jobs: what's still uploading, kept by the chat (React state) and merged
 *    over the server list with `mergeOutbox` — refetches can't drop them.
 *  - swapped: server id → the local key / preview it replaced, for the rest
 *    of the session (module-level, so it survives refetches and remounts).
 */

type FileDocType = "PHOTO" | "DOCUMENT";

/** What every chat attachment type (trip / DM / group) has in common. */
export interface OutboxDoc {
  id: string;
  signedUrl: string;
  thumbUrl?: string | null;
  batchId?: string | null;
  fileName: string;
  fileType: FileDocType;
  uploadedBy: string;
  createdAt: string;
  deletedAt?: string | null;
  caption?: string | null;
  isRead: boolean;
}

/** Present only on local, still-uploading documents. */
type PendingFields = { pending?: true; progress?: number };

export interface OutboxJob<T> {
  id: string;
  /** Which chat it belongs to — e.g. "trip:<id>", "g:<id>", "u:<id>". */
  conversation: string;
  docs: (T & PendingFields)[];
  /** Upload progress 0–100; 100 = bytes sent, server still processing. */
  progress: number;
  /** Server ids present when the job started — see mergeOutbox. */
  knownIds: Set<string>;
}

const swapped = new Map<string, { key: string; preview?: string }>();

/** React key for a document / album: stays the same across the swap. */
export function stableKey(id: string | null | undefined): string {
  if (!id) return "";
  return swapped.get(id)?.key ?? id;
}

export function isPending(doc: object): boolean {
  return (doc as PendingFields).pending === true;
}

/** 0–100 while uploading, undefined for a stored document. */
export function uploadProgress(doc: object): number | undefined {
  const d = doc as PendingFields;
  return d.pending ? (d.progress ?? 0) : undefined;
}

interface ReplyTarget {
  id: string;
  targetType: "msg" | "doc";
  senderName: string | null;
  content: string;
  isDeleted: boolean;
}

const quotedPerson = (name: string | null) => ({
  id: "",
  firstName: name ?? "",
  lastName: null,
  avatar: null,
});

/** Reply quote of a local document — the same one the server will return. */
export function replyFields(target: ReplyTarget | null) {
  const deletedAt = target?.isDeleted ? new Date().toISOString() : null;
  return {
    replyToMessageId: target?.targetType === "msg" ? target.id : null,
    replyTo:
      target?.targetType === "msg"
        ? {
            id: target.id,
            content: target.content,
            deletedAt,
            sender: quotedPerson(target.senderName),
          }
        : null,
    replyToDocumentId: target?.targetType === "doc" ? target.id : null,
    replyToDocument:
      target?.targetType === "doc"
        ? {
            id: target.id,
            fileName: target.content,
            fileType: "DOCUMENT" as const,
            batchId: null,
            deletedAt,
            uploader: quotedPerson(target.senderName),
          }
        : null,
  };
}

/**
 * Local documents for `files`, one per file, shaped like the server's.
 * `extra` fills the type-specific fields (tripId / groupId, uploader, reply).
 */
export function createJob<T extends OutboxDoc>(opts: {
  conversation: string;
  files: File[];
  caption: string | null;
  meId: string;
  serverDocs: { id: string }[];
  extra: Omit<T, keyof OutboxDoc>;
}): OutboxJob<T> {
  const jobId = crypto.randomUUID();
  const batchId = opts.files.length > 1 ? `local-batch-${jobId}` : null;
  const now = Date.now();
  const docs = opts.files.map((file, i) => {
    const url = URL.createObjectURL(file);
    const isPhoto = file.type.startsWith("image/");
    return {
      ...opts.extra,
      id: `local-${jobId}-${i}`,
      signedUrl: url,
      thumbUrl: isPhoto ? url : null,
      batchId,
      fileName: file.name,
      fileType: isPhoto ? "PHOTO" : "DOCUMENT",
      uploadedBy: opts.meId,
      // +i: albums are ordered by createdAt — keep the order they were sent.
      createdAt: new Date(now + i).toISOString(),
      deletedAt: null,
      caption: opts.caption,
      isRead: false,
      pending: true,
    } as T & PendingFields;
  });
  return {
    id: jobId,
    conversation: opts.conversation,
    docs,
    progress: 0,
    knownIds: new Set(opts.serverDocs.map((d) => d.id)),
  };
}

/**
 * Upload done: remember which local document each server one replaces (the
 * server returns them in the order sent). The caller then drops the job and
 * puts `real` into its query cache in the same tick.
 */
export function claimJob<T extends OutboxDoc>(job: OutboxJob<T>, real: T[]) {
  real.forEach((doc, i) => {
    const local = job.docs[i];
    if (!local) return;
    swapped.set(doc.id, {
      key: local.id,
      preview: local.fileType === "PHOTO" ? local.signedUrl : undefined,
    });
    if (doc.batchId && local.batchId) {
      swapped.set(doc.batchId, { key: local.batchId });
    }
  });
  // Files that didn't make it into the chat: their blobs aren't needed.
  job.docs.slice(real.length).forEach((d) => URL.revokeObjectURL(d.signedUrl));
}

/** Upload failed: the local copies go away. */
export function dropJob<T extends OutboxDoc>(job: OutboxJob<T>) {
  job.docs.forEach((d) => URL.revokeObjectURL(d.signedUrl));
}

/** Adds `real` to a cached document list, skipping ids already there. */
export function addToDocList<T extends { id: string }>(
  old: T[] | undefined,
  real: T[],
): T[] {
  const list = old ?? [];
  const have = new Set(list.map((d) => d.id));
  return [...list, ...real.filter((d) => !have.has(d.id))];
}

/**
 * The chat's document list: server documents (own ones swapped from a local
 * copy keep showing the local picture) plus the still-uploading local ones.
 *
 * While a job runs, its files can already arrive over the socket, before
 * the HTTP response says which local file each one is. Own documents the
 * oldest running job didn't know about are hidden until claimed — otherwise
 * they'd flash in twice for a moment.
 */
export function mergeOutbox<T extends OutboxDoc>(
  server: T[],
  jobs: OutboxJob<T>[],
  meId: string | undefined,
): T[] {
  const shown = server.map((d) => {
    const preview = swapped.get(d.id)?.preview;
    return preview ? { ...d, thumbUrl: preview } : d;
  });
  if (!jobs.length) return shown;
  const known = jobs[0].knownIds;
  return [
    ...shown.filter(
      (d) => d.uploadedBy !== meId || known.has(d.id) || swapped.has(d.id),
    ),
    ...jobs.flatMap((j) => j.docs.map((d) => ({ ...d, progress: j.progress }))),
  ];
}
