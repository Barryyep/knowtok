import { describe, expect, test } from "vitest";
import {
  CATEGORY_OPTIONS,
  CURIOSITY_TAGS,
  TAG_TO_CATEGORY,
} from "@/lib/constants";

describe("CATEGORY_OPTIONS", () => {
  test("has exactly 5 entries", () => {
    expect(CATEGORY_OPTIONS).toHaveLength(5);
  });

  test("contains all expected categories", () => {
    const keys = CATEGORY_OPTIONS.map((opt) => opt.key);
    expect(keys).toContain("AI & Robots");
    expect(keys).toContain("Your Health");
    expect(keys).toContain("Your Money");
    expect(keys).toContain("Your Food");
    expect(keys).toContain("Climate");
  });

  test("each entry has a key and label", () => {
    for (const option of CATEGORY_OPTIONS) {
      expect(option.key).toBeTruthy();
      expect(option.label).toBeTruthy();
    }
  });
});

describe("CURIOSITY_TAGS", () => {
  test("has exactly 7 entries", () => {
    expect(CURIOSITY_TAGS).toHaveLength(7);
  });

  test("contains all expected tags", () => {
    expect(CURIOSITY_TAGS).toContain("AI & Robots");
    expect(CURIOSITY_TAGS).toContain("Your Health");
    expect(CURIOSITY_TAGS).toContain("Your Money");
    expect(CURIOSITY_TAGS).toContain("Your Food");
    expect(CURIOSITY_TAGS).toContain("Climate");
    expect(CURIOSITY_TAGS).toContain("Space");
    expect(CURIOSITY_TAGS).toContain("Energy");
  });

  test("is a superset of CATEGORY_OPTIONS keys", () => {
    const categoryKeys = CATEGORY_OPTIONS.map((opt) => opt.key);
    for (const key of categoryKeys) {
      expect(CURIOSITY_TAGS).toContain(key);
    }
  });

  test("Space and Energy are extra tags beyond categories", () => {
    const categoryKeys = new Set(CATEGORY_OPTIONS.map((opt) => opt.key));
    const extraTags = CURIOSITY_TAGS.filter(
      (tag) => !categoryKeys.has(tag as typeof CATEGORY_OPTIONS[number]["key"]),
    );
    expect(extraTags).toContain("Space");
    expect(extraTags).toContain("Energy");
    expect(extraTags).toHaveLength(2);
  });
});

describe("TAG_TO_CATEGORY mapping consistency", () => {
  test("every CATEGORY_OPTIONS key maps to itself in TAG_TO_CATEGORY", () => {
    for (const option of CATEGORY_OPTIONS) {
      expect(TAG_TO_CATEGORY[option.key]).toBe(option.key);
    }
  });

  test("tags without category mapping are not in TAG_TO_CATEGORY", () => {
    const tagsWithoutCategory = CURIOSITY_TAGS.filter(
      (tag) => !(tag in TAG_TO_CATEGORY),
    );
    expect(tagsWithoutCategory).toContain("Space");
    expect(tagsWithoutCategory).toContain("Energy");
  });
});
