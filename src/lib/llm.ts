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
  hookZh: string;
  tags: string[];
  humanCategory: string;
  plainSummary: string;
  plainSummaryZh: string;
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

/**
 * Meta-description phrasing that disqualifies a hook: the hook must state
 * the fact itself, never describe the paper/method.
 */
const META_HOOK_PATTERN =
  /这个新?(方法|技术|模型|模拟器|系统|研究)|^一[种个][^，。]{0,10}(方法|技术|模型|系统|工具|拍卖|模拟器|算法)|该研究|这项(研究|技术)|真吓人|太(神奇|可怕|疯狂)了|惊呆|绝了|[!！]\s*$|[—―–]|this (new )?(method|model|approach|technique|study|simulator|system)|the (researchers|study|paper)|(terrifying|mind-blowing|amazing)[.!]?\s*$/i;

export async function generatePaperMetadata(input: {
  title: string;
  abstract: string;
  categories: string[];
}): Promise<PaperMetadata> {
  const first = await generatePaperMetadataOnce(input);
  if (!META_HOOK_PATTERN.test(first.hookZh) && !META_HOOK_PATTERN.test(first.hook)) {
    return first;
  }
  // One retry: small models occasionally slip back into describing the paper.
  const second = await generatePaperMetadataOnce(input);
  const secondClean =
    !META_HOOK_PATTERN.test(second.hookZh) && !META_HOOK_PATTERN.test(second.hook);
  return secondClean ? second : first;
}

async function generatePaperMetadataOnce(input: {
  title: string;
  abstract: string;
  categories: string[];
}): Promise<PaperMetadata> {
  const { model } = getOpenAIEnv();
  const client = getClient();

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You process academic papers for a general audience. Output JSON only.",
      },
      {
        role: "user",
        content: [
          "Given this research paper, generate six things:",
          '1) "hook": ONE surprise you could blurt out mid-conversation to make someone go "wait, really?". Plain spoken English, ≤100 characters. State the FACT ITSELF — what happens in the world — never describe the paper: any phrasing like "this method/model/simulator/approach/study/technique can..." is FORBIDDEN. Must contain at least one concrete detail (a number, a named thing, a sharp before/after). Talk like a person at a dinner table, but keep it deadpan: the surprise must come from the fact itself — NO emotional editorializing ("terrifying", "amazing", "mind-blowing"), NO exclamation marks, and NO em-dash or en-dash (— or –); use commas instead. End with a period. NO jargon, NO hedging, NO template openers ("Did you know", "Imagine", "What if", "New research", "Scientists found").',
          '2) "tags": 3-5 short English tags (1-3 words each).',
          '3) "humanCategory": classify into exactly ONE of: "AI & Robots", "Your Health", "Your Money", "Your Food", "Climate". If none fit, default to "AI & Robots".',
          '4) "plainSummary": explain this paper so a curious 14-year-old could understand it. No jargon, use concrete examples. Max 3 sentences.',
          '5) "hookZh": 用中文写一句能在聊天里直接讲出口、让人"啊？真的假的"的惊讶点。不超过40个汉字，口语通俗。必须说"世界上发生了什么"这个事实本身，严禁描述论文——凡是"这个方法/这项技术/一种新型XX方法/一个新系统/该研究 能……"式的句子一律不合格，也不要以"一种/一个"开头介绍任何方法或系统——直接从事实主体开头（比如"膝盖扫描现在只要原来1/12的时间"，而不是"一种新型MRI方法能将扫描时间缩短12倍"）。必须包含至少一个具体细节（数字、具体对象、鲜明的前后反差）。语气克制冷静：惊讶感必须来自事实本身，禁止情绪化词尾（真吓人/太神奇了/惊呆了/绝了），禁止感叹号，用句号收尾。禁用含糊词（可能/或许）和套路开头（你知道吗/想象/最新研究/科学家发现）。禁用破折号（——、—、―），改用逗号或句号。',
          '6) "plainSummaryZh": 用中文向一个好奇的14岁少年解释这篇论文。不要用专业术语，用具体的例子。最多3句话。',
          "",
          "Examples of the hook style:",
          'GOOD hook: "A single ChatGPT-style answer can burn through as much water as a small bottle you\'d drink." — concrete, a vivid comparison, sayable out loud.',
          'BAD hook: "New research investigates the environmental resource footprint of large language model inference." — jargon, template opener, no surprise.',
          'GOOD hookZh: "训练一个大模型排的碳，相当于五辆车从出厂到报废的全部排放。" — 有具体数字和反差，能直接讲给人听。',
          'BAD hookZh: "最新研究探讨了大型语言模型在推理过程中的资源消耗问题。" — 套路开头、术语堆砌、没有惊讶点。',
          'BAD hookZh: "这个新方法可以把任何视频变成4D体验，制作沉浸式内容更简单了。" — 在描述论文（"这个新方法"），不是在说事实；没有让人惊讶的具体点。',
          'GOOD hookZh: "一段普通手机视频，现在能直接变成可以绕着走的立体场景。" — 说的是发生了什么，画面感强，语气克制，讲出来别人能接话。',
          "",
          `Title: ${input.title}`,
          `Abstract: ${input.abstract}`,
          `Categories: ${input.categories.join(", ")}`,
          "",
          'Return strict JSON: {"hook":"...","tags":["..."],"humanCategory":"...","plainSummary":"...","hookZh":"...","plainSummaryZh":"..."}',
        ].join("\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawContent) as {
    hook?: string;
    hookZh?: string;
    tags?: unknown;
    humanCategory?: string;
    plainSummary?: string;
    plainSummaryZh?: string;
  };

  const hook = normalizeHook(parsed.hook || input.title);
  const tags = normalizeTags(parsed.tags);
  const humanCategory = validateCategory(parsed.humanCategory);
  const plainSummary = parsed.plainSummary?.trim() || buildFallbackPlainSummary(input.abstract);
  const hookZh = parsed.hookZh?.trim() || "";
  const plainSummaryZh = parsed.plainSummaryZh?.trim() || "";

  return {
    hook,
    hookZh,
    tags,
    humanCategory,
    plainSummary,
    plainSummaryZh,
    model,
    ...usageToTokens(completion.usage),
  };
}

type OwidDomain = { id: string; zh: string; en: string };

type OwidInsight = {
  domainId: string;
  hook: string;
  hookZh: string;
  plainSummary: string;
  plainSummaryZh: string;
  model: string;
} & TokenUsage;

/**
 * Classify + rewrite one Our World in Data "Data Insight" for Ohlo.
 *
 * Unlike generatePaperMetadata (which classifies into the 5 legacy paper
 * categories), this assigns ONE taxonomy DOMAIN id from the OWID-capable set
 * passed in, and writes bilingual hooks/summaries under the SAME hook style
 * rules as the paper generator (fact-first, deadpan, no banned openers,
 * zh ≤50 chars). The domain list is passed in so taxonomy.ts stays the single
 * source of truth.
 */
export async function generateOwidInsight(input: {
  title: string;
  body: string;
  domains: OwidDomain[];
}): Promise<OwidInsight> {
  const { model } = getOpenAIEnv();
  const client = getClient();

  const domainMenu = input.domains
    .map((d) => `- "${d.id}": ${d.en} / ${d.zh}`)
    .join("\n");
  const validIds = new Set(input.domains.map((d) => d.id));
  const fallbackId = input.domains[0]?.id ?? "society";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You turn a data-driven fact from Our World in Data into a punchy, sayable snippet for a general audience. Output JSON only.",
      },
      {
        role: "user",
        content: [
          "Given this Our World in Data insight, generate five things:",
          `1) "domainId": classify the insight into EXACTLY ONE of these domain ids (pick the single best fit):`,
          domainMenu,
          '2) "hook": ONE surprise you could blurt out mid-conversation to make someone go "wait, really?". Plain spoken English, ≤100 characters. State the FACT ITSELF — what is true in the world — never describe the dataset or article: any phrasing like "this data/chart/study shows..." is FORBIDDEN. Must contain at least one concrete detail (a number, a named place, a sharp before/after). Deadpan: the surprise comes from the fact itself — NO editorializing ("shocking", "amazing"), NO exclamation marks, and NO em-dash or en-dash (— or –); use commas instead. End with a period. NO template openers ("Did you know", "Imagine", "What if", "New data", "Data shows").',
          '3) "hookZh": 用中文写一句能在聊天里直接讲出口、让人"啊？真的假的"的惊讶点。不超过40个汉字，口语通俗。必须说事实本身，严禁描述数据集或文章（"这组数据/这张图表明……"一律不合格）。必须包含至少一个具体细节（数字、具体地点、鲜明的前后反差）。语气克制冷静，禁止情绪化词尾（太夸张了/惊呆了）和感叹号，用句号收尾。禁用套路开头（你知道吗/想象/最新数据/数据显示）。禁用破折号（——、—、―），改用逗号或句号。',
          '4) "plainSummary": explain this insight so a curious 14-year-old could understand it. No jargon, concrete examples. Max 3 sentences.',
          '5) "plainSummaryZh": 用中文向一个好奇的14岁少年解释这条洞察。不要用专业术语，用具体的例子。最多3句话。',
          "",
          'GOOD hookZh: "巴基斯坦的肥胖率,20年里翻了三倍。" — 有具体数字和反差，能直接讲给人听。',
          'BAD hookZh: "这组数据显示了肥胖率的变化趋势。" — 在描述数据，不是在说事实。',
          "",
          `Insight title: ${input.title}`,
          `Insight body: ${input.body}`,
          "",
          'Return strict JSON: {"domainId":"...","hook":"...","hookZh":"...","plainSummary":"...","plainSummaryZh":"..."}',
        ].join("\n"),
      },
    ],
  });

  const rawContent = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawContent) as {
    domainId?: string;
    hook?: string;
    hookZh?: string;
    plainSummary?: string;
    plainSummaryZh?: string;
  };

  const domainId = parsed.domainId && validIds.has(parsed.domainId) ? parsed.domainId : fallbackId;
  const hook = normalizeHook(parsed.hook || input.title);
  const hookZh = parsed.hookZh?.trim() || "";
  const plainSummary = parsed.plainSummary?.trim() || buildFallbackPlainSummary(input.body);
  const plainSummaryZh = parsed.plainSummaryZh?.trim() || "";

  return {
    domainId,
    hook,
    hookZh,
    plainSummary,
    plainSummaryZh,
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
  hookZh: string;
  tags: string[];
  humanCategory: string;
  plainSummary: string;
  plainSummaryZh: string;
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
    hookZh: "",
    tags: tags.length > 0 ? tags : ["research", "arxiv"],
    humanCategory: categoryFromPrefix(paper.primaryCategory),
    plainSummary: buildFallbackPlainSummary(paper.abstract),
    plainSummaryZh: "",
  };
}

export async function generatePersonalizedHook(input: {
  globalHook: string;
  plainSummary: string;
  jobTitle: string;
  location: string | null;
  language?: "en" | "zh";
}): Promise<{ text: string } & TokenUsage> {
  const { model } = getOpenAIEnv();
  const client = getClient();

  const lang = input.language || "en";
  const locationPart = input.location ? ` in ${input.location}` : "";

  const systemPrompt = lang === "zh"
    ? `根据这篇论文的摘要和读者是${input.location || ""}的${input.jobTitle}，用中文写一句话（最多25个字），解释为什么这篇论文对他们的生活有影响。要具体——提到他们的工作或日常生活。`
    : "Write ONE sentence (max 25 words) explaining why a paper matters to a specific person. Be specific — reference their job or daily reality.";

  const userPrompt = lang === "zh"
    ? `论文摘要：${input.plainSummary}\n读者是${input.location || ""}的${input.jobTitle}。\n用中文写一句个性化的句子。`
    : `Paper summary: ${input.plainSummary}\nThe reader is a ${input.jobTitle}${locationPart}.\nWrite one personalized sentence.`;

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.7,
    max_tokens: 80,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
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
    const retrySystemPrompt = lang === "zh"
      ? `你必须在回答中提到读者的职业"${input.jobTitle}"。用中文写一句话（最多25个字），解释这篇论文为什么对他们有影响。`
      : `You MUST mention the reader's job "${input.jobTitle}" in your response. Write ONE sentence (max 25 words) explaining why this paper matters to them.`;
    const retryUserPrompt = lang === "zh"
      ? `论文摘要：${input.plainSummary}`
      : `Paper: ${input.plainSummary}`;
    const retry = await client.chat.completions.create({
      model,
      temperature: 0.8,
      max_tokens: 80,
      messages: [
        {
          role: "system",
          content: retrySystemPrompt,
        },
        {
          role: "user",
          content: retryUserPrompt,
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
  language?: "en" | "zh";
}): Promise<ImpactResult> {
  const { model } = getOpenAIEnv();
  const client = getClient();
  const lang = input.language || "en";

  const systemPrompt = lang === "zh"
    ? "你是一个科研解读专家。用中文写3句话（60-90字）。不要重复论文的摘要或标题。第一句：这项研究会如何具体改变这个人的工作或日常生活（举一个真实场景）。第二句：这个变化大概什么时候会发生，或者已经在发生。第三句：这个人现在可以做的一件具体的事。语言要口语化、接地气，不要学术腔。"
    : "You explain how frontier research will concretely change someone's life. Write exactly 3 sentences, 50-80 words. Do NOT repeat the paper summary or hook — go deeper. Sentence 1: a specific real-world scenario of how this affects the person's job or daily life. Sentence 2: when this change is likely to happen (or is already happening). Sentence 3: one concrete action the person can take right now. Be specific, practical, conversational — not academic.";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.6,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: [
          `Paper title: ${input.title}`,
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
