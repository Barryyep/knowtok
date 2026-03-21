import type { FeedCursor, PaperCard } from "@/types/domain";

const DEFAULT_LATEST_RATIO = 0.7;

export function uniqueById(items: PaperCard[]): PaperCard[] {
  const seen = new Set<string>();
  const result: PaperCard[] = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  return result;
}

export function weightedShuffle(
  items: PaperCard[],
  curiosityTags: string[],
  tagToCategory: Record<string, string>,
): PaperCard[] {
  const matchingCategories = new Set(
    curiosityTags.map(tag => tagToCategory[tag]).filter(Boolean)
  );

  // Assign weights: 3x for matching category, 1x for non-matching
  const weighted = items.map(item => ({
    item,
    weight: matchingCategories.has(item.humanCategory) ? 3 : 1,
  }));

  // Weighted Fisher-Yates shuffle
  const result: PaperCard[] = [];
  const pool = [...weighted];

  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < pool.length; i++) {
      random -= pool[i].weight;
      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    result.push(pool[selectedIndex].item);
    pool.splice(selectedIndex, 1);
  }

  return result;
}

function sampleRandom(items: PaperCard[], count: number): PaperCard[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.max(0, count));
}

export function mixFeedItems(options: {
  latest: PaperCard[];
  randomPool: PaperCard[];
  limit: number;
  latestRatio?: number;
}): PaperCard[] {
  const latestRatio = options.latestRatio ?? DEFAULT_LATEST_RATIO;
  const latestTarget = Math.ceil(options.limit * latestRatio);
  const randomTarget = Math.max(options.limit - latestTarget, 0);

  const latestUnique = uniqueById(options.latest).slice(0, latestTarget);

  const latestIds = new Set(latestUnique.map((item) => item.id));
  const randomCandidates = options.randomPool.filter((item) => !latestIds.has(item.id));
  const randomUnique = sampleRandom(uniqueById(randomCandidates), randomTarget);

  const merged = uniqueById([...latestUnique, ...randomUnique]);
  if (merged.length >= options.limit) {
    return merged.slice(0, options.limit);
  }

  const fallback = uniqueById([
    ...merged,
    ...options.latest,
    ...sampleRandom(options.randomPool, options.limit),
  ]);

  return fallback.slice(0, options.limit);
}

export function encodeCursor(cursor: FeedCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf-8").toString("base64url");
}

export function decodeCursor(rawCursor: string | null): FeedCursor {
  if (!rawCursor) {
    return { offset: 0 };
  }

  try {
    const parsed = JSON.parse(Buffer.from(rawCursor, "base64url").toString("utf-8")) as FeedCursor;
    return {
      offset: Number.isFinite(parsed.offset) && parsed.offset >= 0 ? parsed.offset : 0,
    };
  } catch {
    return { offset: 0 };
  }
}
