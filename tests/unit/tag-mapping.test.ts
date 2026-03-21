import { describe, expect, test } from "vitest";
import { TAG_TO_CATEGORY } from "@/lib/constants";

describe("TAG_TO_CATEGORY", () => {
  test("maps AI & Robots to AI & Robots", () => {
    expect(TAG_TO_CATEGORY["AI & Robots"]).toBe("AI & Robots");
  });

  test("maps Your Health to Your Health", () => {
    expect(TAG_TO_CATEGORY["Your Health"]).toBe("Your Health");
  });

  test("maps Your Money to Your Money", () => {
    expect(TAG_TO_CATEGORY["Your Money"]).toBe("Your Money");
  });

  test("maps Your Food to Your Food", () => {
    expect(TAG_TO_CATEGORY["Your Food"]).toBe("Your Food");
  });

  test("maps Climate to Climate", () => {
    expect(TAG_TO_CATEGORY["Climate"]).toBe("Climate");
  });

  test("Space has no category mapping", () => {
    expect(TAG_TO_CATEGORY["Space"]).toBeUndefined();
  });

  test("Energy has no category mapping", () => {
    expect(TAG_TO_CATEGORY["Energy"]).toBeUndefined();
  });

  test("has exactly 5 entries", () => {
    expect(Object.keys(TAG_TO_CATEGORY)).toHaveLength(5);
  });

  test("all values are valid HumanCategory values", () => {
    const validCategories = [
      "AI & Robots",
      "Your Health",
      "Your Money",
      "Your Food",
      "Climate",
    ];
    for (const value of Object.values(TAG_TO_CATEGORY)) {
      expect(validCategories).toContain(value);
    }
  });
});
