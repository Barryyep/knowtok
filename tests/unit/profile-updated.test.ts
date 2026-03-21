import { describe, expect, test } from "vitest";
import { isOnboardingComplete } from "@/lib/profile";

describe("isOnboardingComplete with curiosityTags", () => {
  test("returns true when curiosityTags has items", () => {
    expect(
      isOnboardingComplete({
        curiosityTags: ["AI & Robots", "Your Health"],
      }),
    ).toBe(true);
  });

  test("returns true with jobTitle + curiosityTags", () => {
    expect(
      isOnboardingComplete({
        jobTitle: "Cook",
        curiosityTags: ["Your Food"],
      }),
    ).toBe(true);
  });

  test("returns false for empty curiosityTags and no other fields", () => {
    expect(
      isOnboardingComplete({
        hasResume: false,
        jobTitle: "",
        industry: "",
        skills: [],
        interests: [],
        curiosityTags: [],
        manualNotes: "",
      }),
    ).toBe(false);
  });

  test("returns true with only curiosityTags and no other fields", () => {
    expect(
      isOnboardingComplete({
        hasResume: false,
        jobTitle: "",
        industry: "",
        skills: [],
        interests: [],
        curiosityTags: ["Climate", "Space"],
        manualNotes: "",
      }),
    ).toBe(true);
  });

  test("returns true with single curiosityTag", () => {
    expect(
      isOnboardingComplete({
        curiosityTags: ["Energy"],
      }),
    ).toBe(true);
  });
});
