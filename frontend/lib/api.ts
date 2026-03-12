export type TodayCard = {
  paper_id: string;
  title: string;
  source: string;
  published_at: string;
  hook_text: string;
  plain_summary: string;
  confidence: number;
  source_refs: Array<{ text: string; section: string; rank: number }>;
  impact_level: string;
  time_scale: string;
};

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!apiBaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_API_BASE_URL.");
}

export async function fetchTodayCards(accessToken: string): Promise<TodayCard[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/cards/today`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch cards: ${response.status}`);
  }

  return (await response.json()) as TodayCard[];
}
