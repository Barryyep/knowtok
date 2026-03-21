import { describe, expect, test } from "vitest";
import { categoryFromPrefix } from "@/lib/llm";

describe("categoryFromPrefix comprehensive", () => {
  describe("cs.* prefix -> AI & Robots", () => {
    test("cs.AI", () => expect(categoryFromPrefix("cs.AI")).toBe("AI & Robots"));
    test("cs.LG", () => expect(categoryFromPrefix("cs.LG")).toBe("AI & Robots"));
    test("cs.CV", () => expect(categoryFromPrefix("cs.CV")).toBe("AI & Robots"));
    test("cs.CL", () => expect(categoryFromPrefix("cs.CL")).toBe("AI & Robots"));
    test("cs.RO", () => expect(categoryFromPrefix("cs.RO")).toBe("AI & Robots"));
    test("cs.SE", () => expect(categoryFromPrefix("cs.SE")).toBe("AI & Robots"));
  });

  describe("q-bio.* prefix -> Your Health", () => {
    test("q-bio.BM", () => expect(categoryFromPrefix("q-bio.BM")).toBe("Your Health"));
    test("q-bio.GN", () => expect(categoryFromPrefix("q-bio.GN")).toBe("Your Health"));
    test("q-bio.NC", () => expect(categoryFromPrefix("q-bio.NC")).toBe("Your Health"));
    test("q-bio.PE", () => expect(categoryFromPrefix("q-bio.PE")).toBe("Your Health"));
  });

  describe("q-fin.* and econ.* prefix -> Your Money", () => {
    test("q-fin.CP", () => expect(categoryFromPrefix("q-fin.CP")).toBe("Your Money"));
    test("q-fin.ST", () => expect(categoryFromPrefix("q-fin.ST")).toBe("Your Money"));
    test("q-fin.PM", () => expect(categoryFromPrefix("q-fin.PM")).toBe("Your Money"));
    test("econ.GN", () => expect(categoryFromPrefix("econ.GN")).toBe("Your Money"));
    test("econ.EM", () => expect(categoryFromPrefix("econ.EM")).toBe("Your Money"));
    test("econ.TH", () => expect(categoryFromPrefix("econ.TH")).toBe("Your Money"));
  });

  describe("climate-related prefixes -> Climate", () => {
    test("physics.ao-ph", () => expect(categoryFromPrefix("physics.ao-ph")).toBe("Climate"));
    test("physics.geo-ph", () => expect(categoryFromPrefix("physics.geo-ph")).toBe("Climate"));
    test("astro-ph.EP", () => expect(categoryFromPrefix("astro-ph.EP")).toBe("Climate"));
  });

  describe("non-climate physics defaults to AI & Robots", () => {
    test("physics.hep-th", () => expect(categoryFromPrefix("physics.hep-th")).toBe("AI & Robots"));
    test("physics.quant-ph", () => expect(categoryFromPrefix("physics.quant-ph")).toBe("AI & Robots"));
  });

  describe("other prefixes default to AI & Robots", () => {
    test("math.AG", () => expect(categoryFromPrefix("math.AG")).toBe("AI & Robots"));
    test("math.CO", () => expect(categoryFromPrefix("math.CO")).toBe("AI & Robots"));
    test("hep-th", () => expect(categoryFromPrefix("hep-th")).toBe("AI & Robots"));
    test("cond-mat.str-el", () => expect(categoryFromPrefix("cond-mat.str-el")).toBe("AI & Robots"));
    test("empty string", () => expect(categoryFromPrefix("")).toBe("AI & Robots"));
    test("random text", () => expect(categoryFromPrefix("unknown-prefix")).toBe("AI & Robots"));
  });

  describe("astro-ph subfields", () => {
    test("astro-ph.EP maps to Climate", () => {
      expect(categoryFromPrefix("astro-ph.EP")).toBe("Climate");
    });
    test("astro-ph.GA defaults to AI & Robots (not Climate)", () => {
      expect(categoryFromPrefix("astro-ph.GA")).toBe("AI & Robots");
    });
    test("astro-ph.CO defaults to AI & Robots (not Climate)", () => {
      expect(categoryFromPrefix("astro-ph.CO")).toBe("AI & Robots");
    });
  });
});
