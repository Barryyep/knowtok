/**
 * Tests for normalizeStoredFact (private) via the public loadStoredFact /
 * loadFactHistory wrappers. AsyncStorage is mocked in-memory.
 *
 * Platform.OS is android (from the global react-native mock) so the iOS
 * native surface code (ExtensionStorage, watchSync) never runs.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock heavy RN dependencies ---
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    multiSet: vi.fn(),
    multiRemove: vi.fn(),
    getAllKeys: vi.fn(),
  },
}));
vi.mock("@bacons/apple-targets", () => ({
  ExtensionStorage: class {
    constructor(_group: string) {}
    set(_key: string, _val: string) {}
    remove(_key: string) {}
    static reloadWidget() {}
  },
}));
vi.mock("../watchSync", () => ({ sendFactToWatch: vi.fn() }));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadStoredFact, loadFactHistory } from "../storage";
import type { DailyFact } from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockFact(sourceOverrides: Record<string, unknown> = {}): DailyFact {
  return {
    date: "2026-07-05",
    language: "en",
    emoji: "🧠",
    topic: "Mind & Brain",
    fact: "Test fact.",
    whyCare: "",
    source: {
      kind: "paper",
      factId: "test-uuid",
      label: "arXiv · 2026",
      paperId: "test-uuid",
      ...sourceOverrides,
    } as DailyFact["source"],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// loadStoredFact / normalizeStoredFact
// ---------------------------------------------------------------------------
describe("loadStoredFact — normalizeStoredFact cases", () => {
  it("returns null when AsyncStorage has no entry", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
    expect(await loadStoredFact()).toBeNull();
  });

  it("returns null when source is missing", async () => {
    const raw = JSON.stringify({ date: "2026-07-05", fact: "x", source: undefined });
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(raw);
    expect(await loadStoredFact()).toBeNull();
  });

  it("returns null when factId and paperId are both missing", async () => {
    const raw = JSON.stringify({
      ...mockFact({ factId: undefined, paperId: undefined, kind: "paper" }),
    });
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(raw);
    expect(await loadStoredFact()).toBeNull();
  });

  it("backfills factId from paperId when factId is absent", async () => {
    const raw = JSON.stringify(
      mockFact({ factId: undefined, paperId: "abc-123", kind: undefined }),
    );
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(raw);
    const result = await loadStoredFact();
    expect(result?.source.factId).toBe("abc-123");
  });

  it("infers kind='paper' when paperId is present and kind is absent", async () => {
    const raw = JSON.stringify(
      mockFact({ paperId: "abc-123", kind: undefined }),
    );
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(raw);
    const result = await loadStoredFact();
    expect(result?.source.kind).toBe("paper");
  });

  it("infers kind='general' when no paperId and no arxivId", async () => {
    const raw = JSON.stringify(
      mockFact({ factId: "hash-abc", paperId: undefined, arxivId: undefined, kind: undefined }),
    );
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(raw);
    const result = await loadStoredFact();
    expect(result?.source.kind).toBe("general");
  });

  it("strips stray paperId and arxivId on general kind entries", async () => {
    const raw = JSON.stringify(
      mockFact({
        factId: "hash-xyz",
        kind: "general",
        paperId: "stray-paper",
        arxivId: "stray-arxiv",
      }),
    );
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(raw);
    const result = await loadStoredFact();
    expect(result?.source.paperId).toBeUndefined();
    expect(result?.source.arxivId).toBeUndefined();
  });

  it("backfills empty label when label is absent", async () => {
    const raw = JSON.stringify(
      mockFact({ label: undefined }),
    );
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(raw);
    const result = await loadStoredFact();
    expect(result?.source.label).toBe("");
  });

  it("preserves a well-formed fact without modification", async () => {
    const fact = mockFact();
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(fact));
    const result = await loadStoredFact();
    expect(result?.source.factId).toBe("test-uuid");
    expect(result?.source.kind).toBe("paper");
    expect(result?.date).toBe("2026-07-05");
  });

  it("returns null for unparseable JSON", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce("{not json}");
    expect(await loadStoredFact()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadFactHistory
// ---------------------------------------------------------------------------
describe("loadFactHistory — normalizeStoredFact applied to arrays", () => {
  it("returns empty array when no history key", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
    expect(await loadFactHistory()).toEqual([]);
  });

  it("filters out un-normalizable entries, keeps valid ones", async () => {
    const good = mockFact();
    const bad = { ...mockFact(), source: undefined };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(
      JSON.stringify([good, bad]),
    );
    const result = await loadFactHistory();
    expect(result).toHaveLength(1);
    expect(result[0].source.factId).toBe("test-uuid");
  });

  it("returns empty array for non-array JSON", async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify({ not: "array" }));
    expect(await loadFactHistory()).toEqual([]);
  });
});
