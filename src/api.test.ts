import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  ApiError,
  fetchExam,
  submitExam,
  setExamToken,
  clearExamToken,
  decodeExamToken,
} from "./api";
import type { SubmitRequest } from "@jteban1/shared";

function mockFetchOnce(res: Partial<Response> & { text: () => Promise<string> }) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(res as Response);
}

const EMPTY_SUBMIT: SubmitRequest = {
  versionCode: "A",
  info: { name: "A", email: "a@x.co" },
  answers: [],
};

describe("api request()", () => {
  beforeEach(() => {
    clearExamToken();
    sessionStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("attaches the Bearer exam token when one is set", async () => {
    setExamToken("tok123");
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ versionCode: "A", versionName: "A", questions: [] }),
      text: () => Promise.resolve(""),
    } as never);

    await fetchExam("A");

    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer tok123");
  });

  it("sends no Authorization header when there is no token", async () => {
    const fetchMock = mockFetchOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    } as never);

    await fetchExam("A");

    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("throws an ApiError carrying the parsed 403 cooldown body", async () => {
    mockFetchOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: () => Promise.resolve(JSON.stringify({ error: "Retake cooldown active.", remainingMs: 5000 })),
    } as never);

    await expect(submitExam(EMPTY_SUBMIT)).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
    });
    try {
      await submitExam(EMPTY_SUBMIT);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).body).toMatchObject({ remainingMs: 5000 });
    }
  });

  it("falls back to the raw text for a non-JSON error body", async () => {
    mockFetchOnce({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: () => Promise.resolve("boom"),
    } as never);

    await expect(fetchExam("A")).rejects.toMatchObject({ status: 500, message: "boom" });
  });
});

describe("decodeExamToken", () => {
  it("decodes identity claims from a JWT payload without verifying the signature", () => {
    const payload = { sub: "u1", name: "Ada", email: "ada@x.co", examVersion: "B" };
    const b64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const token = `header.${b64}.sig`;
    expect(decodeExamToken(token)).toEqual({
      ltiUserId: "u1",
      name: "Ada",
      email: "ada@x.co",
      examVersion: "B",
    });
  });

  it("returns null for a malformed token", () => {
    expect(decodeExamToken("not-a-jwt")).toBeNull();
  });
});
