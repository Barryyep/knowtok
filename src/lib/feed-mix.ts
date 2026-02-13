import type { FeedCursor, PaperCard } from "@/types/domain";

const DEFAULT_LATEST_RATIO = 0.7;

function uniqueById(items: PaperCard[]): PaperCard[] {
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
