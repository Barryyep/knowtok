import { describe, it, expect } from "vitest";
import { categoryEmoji, categoryLabel } from "../categories";

describe("categoryEmoji", () => {
  it("legacy CATEGORY_META key returns the correct emoji", () => {
    expect(categoryEmoji("AI & Robots")).toBe("🤖");
    expect(categoryEmoji("Your Health")).toBe("🫀");
    expect(categoryEmoji("Your Money")).toBe("💰");
    expect(categoryEmoji("Your Food")).toBe("🍜");
    expect(categoryEmoji("Climate")).toBe("🌍");
  });

  it("taxonomy domain id returns domain-specific emoji", () => {
    expect(categoryEmoji("tech_ai")).toBe("🤖");
    expect(categoryEmoji("space")).toBe("🪐");
    expect(categoryEmoji("health")).toBe("🫀");
    expect(categoryEmoji("mind")).toBe("🧠");
  });

  it("unknown category returns the fallback emoji 💡", () => {
    expect(categoryEmoji("unknown-xyz")).toBe("💡");
  });
});

describe("categoryLabel", () => {
  it("legacy key: returns en label in en mode", () => {
    expect(categoryLabel("AI & Robots", "en")).toBe("AI & Robots");
    expect(categoryLabel("Your Health", "en")).toBe("Health");
  });

  it("legacy key: returns zh label in zh mode", () => {
    expect(categoryLabel("AI & Robots", "zh")).toBe("AI与机器人");
  });

  it("taxonomy domain id: returns domain en name in en mode", () => {
    expect(categoryLabel("tech_ai", "en")).toBe("Tech & AI");
    expect(categoryLabel("space", "en")).toBe("Space");
  });

  it("taxonomy domain id: returns domain zh name in zh mode", () => {
    expect(categoryLabel("tech_ai", "zh")).toBe("科技与AI");
  });

  it("unknown category returns 'Research' (en) or '科研' (zh)", () => {
    expect(categoryLabel("unknown-xyz", "en")).toBe("Research");
    expect(categoryLabel("unknown-xyz", "zh")).toBe("科研");
  });
});
