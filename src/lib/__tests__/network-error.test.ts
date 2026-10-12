import { describe, expect, it } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { isNetworkError } from "../network-error";

const answered = (status: number) =>
  new AxiosError("x", "ERR_BAD_RESPONSE", undefined, undefined, {
    status,
    statusText: "",
    data: {},
    headers: {},
    config: { headers: new AxiosHeaders() },
  });

describe("isNetworkError", () => {
  it("is true when the request got no response at all", () => {
    expect(isNetworkError(new AxiosError("Network Error", "ERR_NETWORK"))).toBe(true);
    expect(isNetworkError(new AxiosError("timeout", "ECONNABORTED"))).toBe(true);
  });

  it("is false when the server answered, or the request was cancelled", () => {
    expect(isNetworkError(answered(500))).toBe(false);
    expect(isNetworkError(answered(401))).toBe(false);
    expect(isNetworkError(new AxiosError("canceled", "ERR_CANCELED"))).toBe(false);
    expect(isNetworkError(new Error("boom"))).toBe(false);
  });
});
