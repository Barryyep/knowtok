import { describe, it, expect } from "vitest";
import { DOMAINS, SPARKS } from "../taxonomy";

describe("taxonomy invariants", () => {
  it("every DOMAIN has at least 4 SPARKS", () => {
    for (const domain of DOMAINS) {
      const sparks = SPARKS.filter((s) => s.domainId === domain.id);
      expect(
        sparks.length,
        `domain "${domain.id}" has ${sparks.length} sparks (need ≥4)`,
      ).toBeGreaterThanOrEqual(4);
    }
  });

  it("every SPARK.domainId references a known DOMAIN", () => {
    const domainIds = new Set(DOMAINS.map((d) => d.id));
    for (const spark of SPARKS) {
      expect(
        domainIds.has(spark.domainId),
        `spark domainId "${spark.domainId}" not found in DOMAINS`,
      ).toBe(true);
    }
  });

  it("every SPARK has non-empty zh and en fields", () => {
    for (const spark of SPARKS) {
      expect(spark.zh.trim().length, `spark domainId=${spark.domainId} zh is empty`).toBeGreaterThan(0);
      expect(spark.en.trim().length, `spark domainId=${spark.domainId} en is empty`).toBeGreaterThan(0);
    }
  });

  it("no two SPARKS are identical (same zh+en)", () => {
    const seen = new Set<string>();
    for (const spark of SPARKS) {
      const key = `${spark.zh}|||${spark.en}`;
      expect(seen.has(key), `duplicate spark: "${spark.en}"`).toBe(false);
      seen.add(key);
    }
  });
});
