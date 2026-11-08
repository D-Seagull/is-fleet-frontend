import { describe, expect, it } from "vitest";
import {
  claimJob,
  createJob,
  mergeOutbox,
  stableKey,
  uploadProgress,
  type OutboxDoc,
} from "../outbox";

type Doc = OutboxDoc & { chatId: string };

const ME = "me";
const stored = (id: string, extra: Partial<Doc> = {}): Doc => ({
  id,
  chatId: "c1",
  signedUrl: `https://cdn/${id}`,
  thumbUrl: `https://cdn/${id}.thumb`,
  batchId: null,
  fileName: `${id}.png`,
  fileType: "PHOTO",
  uploadedBy: "other",
  createdAt: "2026-10-06T10:00:00.000Z",
  deletedAt: null,
  caption: null,
  isRead: false,
  ...extra,
});
const png = (name: string) => new File(["x"], name, { type: "image/png" });

const newJob = (server: Doc[], files: File[]) =>
  createJob<Doc>({
    conversation: "c1",
    files,
    caption: "CMR",
    meId: ME,
    serverDocs: server,
    extra: { chatId: "c1" },
  });

describe("outbox — voice messages", () => {
  it("shows a recording at once as a pending AUDIO document with its length", () => {
    const voice = new File(["x"], "voice-1.m4a", { type: "audio/mp4" });
    const job = createJob<Doc & { durationMs?: number | null }>({
      conversation: "c1",
      files: [voice],
      caption: null,
      durationMs: 7421,
      meId: ME,
      serverDocs: [],
      extra: { chatId: "c1" },
    });
    const [doc] = job.docs;
    expect(doc.fileType).toBe("AUDIO");
    expect(doc.durationMs).toBe(7421);
    expect(doc.thumbUrl).toBeNull();
    expect(doc.signedUrl).toMatch(/^blob:/);
  });

  it("ignores a length given for a non-audio file", () => {
    const job = createJob<Doc & { durationMs?: number | null }>({
      conversation: "c1",
      files: [png("1.png")],
      caption: null,
      durationMs: 5000,
      meId: ME,
      serverDocs: [],
      extra: { chatId: "c1" },
    });
    expect(job.docs[0].fileType).toBe("PHOTO");
    expect(job.docs[0].durationMs).toBeNull();
  });
});

describe("outbox", () => {
  it("shows the files as pending documents at once, as an album", () => {
    const server = [stored("a")];
    const job = newJob(server, [png("1.png"), png("2.png")]);
    const merged = mergeOutbox(server, [job], ME);

    expect(merged).toHaveLength(3);
    const [one, two] = merged.slice(1);
    expect(uploadProgress(one)).toBe(0);
    expect(one.batchId).toBeTruthy();
    expect(two.batchId).toBe(one.batchId);
    expect(one.caption).toBe("CMR");
    expect(one.thumbUrl).toMatch(/^blob:/);
  });

  it("hides own socket copies until the upload's answer claims them", () => {
    const job = newJob([], [png("1.png")]);
    const echoed = stored("real-1", { uploadedBy: ME });
    // Socket delivered it before the HTTP response: not shown twice.
    expect(mergeOutbox([echoed], [job], ME).map((d) => d.id)).toEqual([
      job.docs[0].id,
    ]);
    // Someone else's new file is never held back.
    const theirs = stored("t1");
    expect(mergeOutbox([theirs], [job], ME)).toHaveLength(2);
  });

  it("swaps in place: same key, local picture kept, not pending", () => {
    const job = newJob([], [png("1.png"), png("2.png")]);
    const local = job.docs.map((d) => ({ id: d.id, url: d.signedUrl }));
    const real = [
      stored("r1", { uploadedBy: ME, batchId: "b" }),
      stored("r2", { uploadedBy: ME, batchId: "b" }),
    ];
    claimJob(job, real);
    const merged = mergeOutbox(real, [], ME);

    expect(merged.map((d) => stableKey(d.id))).toEqual(local.map((l) => l.id));
    expect(merged.map((d) => d.thumbUrl)).toEqual(local.map((l) => l.url));
    expect(merged.map((d) => d.signedUrl)).toEqual([
      "https://cdn/r1",
      "https://cdn/r2",
    ]);
    expect(merged.every((d) => uploadProgress(d) === undefined)).toBe(true);
    expect(stableKey("b")).toBe(job.docs[0].batchId);
  });
});
