import type { OnboardingProfile } from "@/lib/storage";

export type TodayCard = {
  paper_id: string;
  title: string;
  abstract: string;
  source: string;
  published_at: string;
  hook_text: string;
  plain_summary: string;
  confidence: number;
  source_refs: Array<{ text: string; section: string; rank: number }>;
  impact_level: string;
  time_scale: string;
  authors: string[];
  primary_category: string | null;
  comment: string | null;
  journal_ref: string | null;
  subjects: string[];
  submission_history: string | null;
  links: Array<{ label: string; url: string }>;
};

export type PersonalizedHook = {
  paper_id: string;
  hook_text: string;
  confidence: number;
  user_profile_hash: string;
  template_id: string;
  cache_hit: boolean;
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

export async function fetchPersonalizedHook(
  accessToken: string,
  paperId: string,
  profile: OnboardingProfile,
): Promise<PersonalizedHook> {
  const response = await fetch(`${apiBaseUrl}/api/v1/cards/${paperId}/hook`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
    body: JSON.stringify({
      profile: {
        role: profile.role,
        interests: profile.interests,
        age_group: profile.ageGroup,
        reading_preference: profile.readingPreference,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch personalized hook: ${response.status}`);
  }

  return (await response.json()) as PersonalizedHook;
}
