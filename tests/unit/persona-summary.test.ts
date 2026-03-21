import { describe, expect, test } from "vitest";
import { composePersonaSummary } from "@/lib/persona-summary";

describe("composePersonaSummary with new fields", () => {
  test("includes location when provided", () => {
    const result = composePersonaSummary({
      jobTitle: "Cook",
      industry: null,
      skills: null,
      interests: null,
      manualNotes: null,
      resumeText: null,
      location: "Shanghai",
    });
    expect(result).toContain("Location: Shanghai");
  });

  test("includes ageRange when provided", () => {
    const result = composePersonaSummary({
      jobTitle: "Driver",
      industry: null,
      skills: null,
      interests: null,
      manualNotes: null,
      resumeText: null,
      ageRange: "35-44",
    });
    expect(result).toContain("Age: 35-44");
  });

  test("includes both location and ageRange", () => {
    const result = composePersonaSummary({
      jobTitle: "Cook",
      industry: null,
      skills: null,
      interests: null,
      manualNotes: null,
      resumeText: null,
      location: "Taipei",
      ageRange: "25-34",
    });
    expect(result).toContain("Location: Taipei");
    expect(result).toContain("Age: 25-34");
    expect(result).toContain("Role: Cook");
  });

  test("omits location and ageRange when null", () => {
    const result = composePersonaSummary({
      jobTitle: "Engineer",
      industry: null,
      skills: null,
      interests: null,
      manualNotes: null,
      resumeText: null,
    });
    expect(result).not.toContain("Location:");
    expect(result).not.toContain("Age:");
  });

  test("omits location and ageRange when undefined", () => {
    const result = composePersonaSummary({
      jobTitle: "Designer",
      industry: null,
      skills: null,
      interests: null,
      manualNotes: null,
      resumeText: null,
    });
    expect(result).not.toContain("Location:");
    expect(result).not.toContain("Age:");
    expect(result).toContain("Role: Designer");
  });

  test("includes all fields together", () => {
    const result = composePersonaSummary({
      jobTitle: "Chef",
      industry: "Hospitality",
      skills: ["cooking", "management"],
      interests: ["food science"],
      manualNotes: "I run a small restaurant",
      resumeText: null,
      location: "Tokyo",
      ageRange: "45-54",
    });
    expect(result).toContain("Role: Chef");
    expect(result).toContain("Industry: Hospitality");
    expect(result).toContain("Skills: cooking, management");
    expect(result).toContain("Interests: food science");
    expect(result).toContain("Notes: I run a small restaurant");
    expect(result).toContain("Location: Tokyo");
    expect(result).toContain("Age: 45-54");
  });

  test("returns fallback when no fields provided", () => {
    const result = composePersonaSummary({
      jobTitle: null,
      industry: null,
      skills: null,
      interests: null,
      manualNotes: null,
      resumeText: null,
    });
    expect(result).toBe("No profile provided yet.");
  });
});
