import OpenAI from "openai";
import { getOpenAIEnv } from "@/lib/env";

type TokenUsage = {
  tokenInput: number;
  tokenOutput: number;
};

type HookAndTags = {
  hook: string;
  tags: string[];
  model: string;
} & TokenUsage;

type PaperMetadata = {
  hook: string;
  tags: string[];
  humanCategory: string;
  plainSummary: string;
  model: string;
} & TokenUsage;

type ImpactResult = {
  text: string;
  model: string;
} & TokenUsage;

let cachedClient: OpenAI | null = null;

function getClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const { apiKey } = getOpenAIEnv();
  cachedClient = new OpenAI({ apiKey });
  return cachedClient;
}

function usageToTokens(usage?: {
  prompt_tokens?: number;
  completion_tokens?: number;
}): TokenUsage {
  return {
    tokenInput: usage?.prompt_tokens ?? 0,
    tokenOutput: usage?.completion_tokens ?? 0,
  };
}

function normalizeHook(text: string): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  const words = trimmed.split(" ").filter(Boolean);
  if (words.length <= 28) {
    return trimmed;
  }
  return `${words.slice(0, 28).join(" ").replace(/[,.!?;:]+$/, "")}.`;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  const normalized = tags
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0)
    .map((item) => item.slice(0, 30));

  return Array.from(new Set(normalized)).slice(0, 5);
}

const VALID_CATEGORIES = ["AI & Robots", "Your Health", "Your Money", "Your Food", "Climate"];

function validateCategory(category: string | undefined): string {
  if (category && VALID_CATEGORIES.includes(category)) {
    return category;
  }
  return "AI & Robots";
}

function buildFallbackPlainSummary(abstract: string): string {
  const sentences = abstract.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.slice(0, 3).join(". ").trim() + ".";
}

// Category fallback from arXiv prefix
export function categoryFromPrefix(primaryCategory: string): string {
  if (primaryCategory.startsWith("cs.")) return "AI & Robots";
  if (primaryCategory.startsWith("q-bio.")) return "Your Health";
  if (primaryCategory.startsWith("q-fin.") || primaryCategory.startsWith("econ.")) return "Your Money";
  if (primaryCategory.startsWith("physics.ao-ph") || primaryCategory.startsWith("physics.geo-ph") || primaryCategory.startsWith("astro-ph.EP")) return "Climate";
  return "AI & Robots";
}

export async function generatePaperMetadata(input: {
  title: string;
  abstract: string;
  categories: string[];
}): Promise<PaperMetadata> {
  const { model } = getOpenAIEnv();
  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 500,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You process academic papers for a general audience. Output JSON only.",
      },
      {
        role: "user",
        content: [
          "Given this research paper, generate four things:",
          '1) "hook": one curiosity-driven sentence, 20-28 words, plain English, no jargon.',
          '2) "tags": 3-5 short English tags (1-3 words each).',
          '3) "humanCategory": classify into exactly ONE of: "AI & Robots", "Your Health", "Your Money", "Your Food", "Climate". If none fit, default to "AI & Robots".',
          '4) "plainSummary": explain this paper so a curious 14-year-old could understand it. No jargon, use concrete examples. Max 3 sentences.',
          "",
          `Title: ${input.title}`,
          `Abstract: ${input.abstract}`,
          `Categories: ${input.categories.join(", ")}`,
          "",
          'Return strict JSON: {"hook":"...","tags":["..."],"humanCategory":"...","plainSummary":"..."}',
        ].join("\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawContent) as {
    hook?: string;
    tags?: unknown;
    humanCategory?: string;
    plainSummary?: string;
  };

  const hook = normalizeHook(parsed.hook || input.title);
  const tags = normalizeTags(parsed.tags);
  const humanCategory = validateCategory(parsed.humanCategory);
  const plainSummary = parsed.plainSummary?.trim() || buildFallbackPlainSummary(input.abstract);

  return {
    hook,
    tags,
    humanCategory,
    plainSummary,
    model,
    ...usageToTokens(completion.usage),
  };
}

/** @deprecated Use generatePaperMetadata instead. Kept for backwards compatibility. */
export async function generatePaperHookAndTags(input: {
  title: string;
  abstract: string;
  categories: string[];
}): Promise<HookAndTags> {
  const metadata = await generatePaperMetadata(input);
  return {
    hook: metadata.hook,
    tags: metadata.tags,
    model: metadata.model,
    tokenInput: metadata.tokenInput,
    tokenOutput: metadata.tokenOutput,
  };
}

export function buildFallbackMetadata(paper: { title: string; abstract: string; categories: string[]; primaryCategory: string }): {
  hook: string;
  tags: string[];
  humanCategory: string;
  plainSummary: string;
} {
  const abstract = paper.abstract.replace(/\s+/g, " ").trim();
  const words = abstract.split(" ").filter(Boolean);
  const hook = words.length > 28
    ? `${words.slice(0, 28).join(" ").replace(/[,.!?;:]+$/, "")}.`
    : abstract || `${paper.title} introduces a new research direction with practical implications.`;

  const categoryTags = paper.categories
    .map(c => c.split(".").pop() || c)
    .map(t => t.replace(/[^a-zA-Z0-9\- ]/g, "").trim())
    .filter(Boolean);
  const tags = Array.from(new Set(categoryTags)).slice(0, 5);

  return {
    hook,
    tags: tags.length > 0 ? tags : ["research", "arxiv"],
    humanCategory: categoryFromPrefix(paper.primaryCategory),
    plainSummary: buildFallbackPlainSummary(paper.abstract),
  };
}

export async function generatePersonalizedHook(input: {
  globalHook: string;
  plainSummary: string;
  jobTitle: string;
  location: string | null;
}): Promise<{ text: string } & TokenUsage> {
  const { model } = getOpenAIEnv();
  const client = getClient();

  const locationPart = input.location ? ` in ${input.location}` : "";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 80,
    messages: [
      {
        role: "system",
        content: "Write ONE sentence (max 25 words) explaining why a paper matters to a specific person. Be specific — reference their job or daily reality.",
      },
      {
        role: "user",
        content: `Paper summary: ${input.plainSummary}\nThe reader is a ${input.jobTitle}${locationPart}.\nWrite one personalized sentence.`,
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || input.globalHook;

  // Quality gate: check if hook references the job
  const jobWords = input.jobTitle.toLowerCase().split(/\s+/);
  const textLower = text.toLowerCase();
  const referencesJob = jobWords.some(w => w.length > 2 && textLower.includes(w));

  if (!referencesJob) {
    // Try once more with explicit prompt
    const retry = await client.chat.completions.create({
      model,
      temperature: 0.8,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content: `You MUST mention the reader's job "${input.jobTitle}" in your response. Write ONE sentence (max 25 words) explaining why this paper matters to them.`,
        },
        {
          role: "user",
          content: `Paper: ${input.plainSummary}`,
        },
      ],
    });

    const retryText = retry.choices[0]?.message?.content?.trim();
    if (retryText) {
      return {
        text: retryText,
        ...usageToTokens(retry.usage),
      };
    }
  }

  return {
    text,
    ...usageToTokens(completion.usage),
  };
}

function normalizeImpact(text: string): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (words.length <= 55) {
    return words.join(" ");
  }
  return `${words.slice(0, 55).join(" ").replace(/[,.!?;:]+$/, "")}.`;
}

export function buildFallbackImpact(input: { title: string; tags: string[] }): string {
  const topic = input.tags[0] || "this research area";
  return `This paper hints at changes that could shape decisions around ${topic}, even outside academia. Skim the abstract and note one idea you can test this week in your work or daily routine.`;
}

export async function generateImpactBrief(input: {
  title: string;
  hookSummaryEn: string;
  abstract: string;
  tags: string[];
  personaSummary: string;
}): Promise<ImpactResult> {
  const { model } = getOpenAIEnv();
  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.6,
    max_tokens: 140,
    messages: [
      {
        role: "system",
        content:
          "You explain how frontier research matters to a person. Output exactly two sentences in plain English, 35-55 words total. Sentence 1: why it matters for the person. Sentence 2: one concrete next action. No hype or absolute claims.",
      },
      {
        role: "user",
        content: [
          `Paper title: ${input.title}`,
          `Paper hook: ${input.hookSummaryEn}`,
          `Paper abstract: ${input.abstract}`,
          `Paper tags: ${input.tags.join(", ")}`,
          `User profile: ${input.personaSummary}`,
        ].join("\n"),
      },
    ],
  });

  const text = completion.choices[0]?.message?.content?.trim() || buildFallbackImpact({
    title: input.title,
    tags: input.tags,
  });

  return {
    text: normalizeImpact(text),
    model,
    ...usageToTokens(completion.usage),
  };
}
