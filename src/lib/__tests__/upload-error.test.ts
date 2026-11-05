import { describe, expect, it } from "vitest";
import { uploadErrorText } from "../upload-error";

// The server's upload refusals (P1-1) read as a real reason, not "failed".
describe("uploadErrorText", () => {
  const t = (key: string) => key;
  const http = (status: number) => ({ response: { status } });

  it("413 → file too large", () => {
    expect(uploadErrorText(http(413), t)).toBe("fileTooLarge");
  });
  it("415 → type not supported", () => {
    expect(uploadErrorText(http(415), t)).toBe("fileTypeNotSupported");
  });
  it("anything else → the generic message", () => {
    expect(uploadErrorText(http(500), t)).toBe("failed");
    expect(uploadErrorText(new Error("offline"), t)).toBe("failed");
  });
});
