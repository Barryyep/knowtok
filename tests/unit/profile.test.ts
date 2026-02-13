import { describe, expect, test } from "vitest";
import { isOnboardingComplete, splitCsv } from "@/lib/profile";

describe("splitCsv", () => {
  test("splits and trims values", () => {
    expect(splitCsv("ai, ml , product")).toEqual(["ai", "ml", "product"]);
  });

  test("drops empty values", () => {
    expect(splitCsv(",,design,,")).toEqual(["design"]);
  });
});

describe("isOnboardingComplete", () => {
  test("returns true when resume exists", () => {
    expect(
      isOnboardingComplete({
        hasResume: true,
      }),
    ).toBe(true);
  });

  test("returns true when at least one profile field exists", () => {
    expect(
      isOnboardingComplete({
        jobTitle: "Engineer",
      }),
    ).toBe(true);
  });

  test("returns false for empty profile without resume", () => {
    expect(
      isOnboardingComplete({
        hasResume: false,
        jobTitle: "",
        industry: "",
        skills: [],
        interests: [],
        manualNotes: "",
      }),
    ).toBe(false);
  });
});
