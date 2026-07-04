import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { verifyIngestSecret } from "@/lib/ingest-auth";

const SECRET = "s3cr3t-ingest-token";

describe("verifyIngestSecret", () => {
  beforeEach(() => {
    process.env.INGEST_SHARED_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.INGEST_SHARED_SECRET;
  });

  test("accepts the exact configured secret", () => {
    expect(verifyIngestSecret(SECRET)).toBe(true);
  });

  test("rejects a wrong secret of equal length", () => {
    const wrong = "x".repeat(SECRET.length);
    expect(verifyIngestSecret(wrong)).toBe(false);
  });

  test("rejects a wrong secret of different length", () => {
    expect(verifyIngestSecret(SECRET + "extra")).toBe(false);
    expect(verifyIngestSecret(SECRET.slice(0, -1))).toBe(false);
  });

  test("rejects a missing header (null/undefined)", () => {
    expect(verifyIngestSecret(null)).toBe(false);
    expect(verifyIngestSecret(undefined)).toBe(false);
  });

  test("rejects an empty string", () => {
    expect(verifyIngestSecret("")).toBe(false);
  });
});
