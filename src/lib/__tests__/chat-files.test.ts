import { describe, expect, it } from "vitest";
import { addToQueue, chatFilesFrom, MAX_CHAT_FILES } from "../chat-files";

const file = (name: string, type: string) => new File(["x"], name, { type });
const at = new Date(2026, 9, 6, 14, 3, 7);

describe("chatFilesFrom", () => {
  it("renames a pasted screenshot after the time it was pasted", () => {
    const [f] = chatFilesFrom([file("image.png", "image/png")], at);
    expect(f.name).toBe("screenshot-2026-10-06-14-03-07.png");
    expect(f.type).toBe("image/png");
  });

  it("numbers several pasted at once", () => {
    const names = chatFilesFrom(
      [file("image.png", "image/png"), file("image.png", "image/png")],
      at,
    ).map((f) => f.name);
    expect(names).toEqual([
      "screenshot-2026-10-06-14-03-07.png",
      "screenshot-2026-10-06-14-03-07-2.png",
    ]);
  });

  it("keeps real file names and drops types the chat can't take", () => {
    const names = chatFilesFrom(
      [
        file("CMR 4825.pdf", "application/pdf"),
        file("photo.jpg", "image/jpeg"),
        file("setup.exe", "application/octet-stream"),
        file("notes.txt", "text/plain"),
      ],
      at,
    ).map((f) => f.name);
    expect(names).toEqual(["CMR 4825.pdf", "photo.jpg"]);
  });

  it("is empty for a plain-text paste", () => {
    expect(chatFilesFrom(null)).toEqual([]);
  });
});

describe("addToQueue", () => {
  it(`caps the queue at ${MAX_CHAT_FILES}`, () => {
    const many = Array.from({ length: 8 }, (_, i) => file(`${i}.png`, "image/png"));
    expect(addToQueue(many, many)).toHaveLength(MAX_CHAT_FILES);
  });
});
