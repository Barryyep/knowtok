import { describe, expect, test } from "vitest";
import { parseArxivIdentifier } from "@/lib/arxiv";

describe("parseArxivIdentifier", () => {
  test("parses modern arxiv IDs with versions", () => {
    const parsed = parseArxivIdentifier("https://arxiv.org/abs/2501.12345v3");
    expect(parsed).toEqual({
      base: "2501.12345",
      version: 3,
    });
  });

  test("defaults to version 1 when suffix is missing", () => {
    const parsed = parseArxivIdentifier("https://arxiv.org/abs/2501.12345");
    expect(parsed).toEqual({
      base: "2501.12345",
      version: 1,
    });
  });

  test("parses legacy IDs", () => {
    const parsed = parseArxivIdentifier("hep-th/9901001v2");
    expect(parsed).toEqual({
      base: "hep-th/9901001",
      version: 2,
    });
  });
});
