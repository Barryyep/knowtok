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

export async function generatePaperHookAndTags(input: {
  title: string;
  abstract: string;
  categories: string[];
}): Promise<HookAndTags> {
  const { model } = getOpenAIEnv();
  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 220,
    response_format: {
      type: "json_object",
    },
    messages: [
      {
        role: "system",
        content:
          "You create irresistible but accurate short paper hooks for non-specialists. Keep it plain English, no jargon-heavy phrasing, no hype claims, and output JSON only.",
      },
      {
        role: "user",
        content: [
          "Given the research paper info below, generate:",
          '1) "hook": one sentence, 20-28 words, curiosity-driven and easy to understand.',
          '2) "tags": 3 to 5 short English tags (1-3 words each).',
          "",
          `Title: ${input.title}`,
          `Abstract: ${input.abstract}`,
          `Categories: ${input.categories.join(", ")}`,
          "",
          'Return strict JSON in the shape: {"hook":"...","tags":["...","..."]}',
        ].join("\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawContent) as { hook?: string; tags?: unknown };

  const hook = normalizeHook(parsed.hook || input.title);
  const tags = normalizeTags(parsed.tags);

  return {
    hook,
    tags,
    model,
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
