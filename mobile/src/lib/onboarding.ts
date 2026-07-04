/**
 * Direction-B onboarding contract (「信差审阅」— docs/onboarding-research.md).
 *
 * The old free-text About form is replaced by two single-screen choices:
 * a reader-type card (who the letter is for) and a reading-style card
 * (what kind of letter). Profile.occupation stores a ReaderType id and
 * Profile.interests stores a ReadingStyle id for users onboarded this way;
 * LEGACY profiles may still hold free text in both fields, so every
 * consumer must resolve through the helpers below instead of using the
 * raw values.
 */
import type { AppLanguage } from "./types";

export interface ReaderType {
  id: string;
  /** Full card copy shown during onboarding. */
  zh: string;
  en: string;
  /** Short label for the reveal profile card / Settings. */
  labelZh: string;
  labelEn: string;
  /** English persona line substituted into LLM prompts. */
  prompt: string;
}

export const READER_TYPES: ReaderType[] = [
  {
    id: "professional",
    zh: "在职场里穿行的人——会议、截止日期、需要能拿出手的谈资",
    en: "Moving through workplaces — meetings, deadlines, and the need to sound informed",
    labelZh: "在职场里穿行的人",
    labelEn: "Moving through workplaces",
    prompt:
      "a working professional who wants sharp, conversation-ready knowledge for meetings and dinners",
  },
  {
    id: "student",
    zh: "在学校里保持好奇的人——考试之外,也想知道世界长什么样",
    en: "Keeping curiosity alive at school — beyond exams, also interested in how the world works",
    labelZh: "在学校里保持好奇的人",
    labelEn: "Keeping curiosity alive at school",
    prompt:
      "a student who is curious about how the world works beyond the exam syllabus",
  },
  {
    id: "homemaker",
    zh: "在家里平衡一切的人——家庭、孩子、零碎的独处时间",
    en: "Balancing everything at home — family, children, slivers of alone time",
    labelZh: "在家里平衡一切的人",
    labelEn: "Balancing everything at home",
    prompt:
      "someone managing a household and family who reads in short pockets of alone time",
  },
  {
    id: "other",
    zh: "没有标准描述——自由职业、创业,或者就是不想被分类",
    en: "No standard description — freelance, building something, or simply uncategorizable",
    labelZh: "没有标准描述的人",
    labelEn: "No standard description",
    prompt:
      "an independent-minded reader (freelance, founder, or simply uncategorizable)",
  },
];

export interface ReadingStyle {
  id: string;
  /** Full card copy shown during onboarding. */
  zh: string;
  en: string;
  /** Short label for the reveal profile card / Settings. */
  labelZh: string;
  labelEn: string;
  /** English persona line substituted into LLM prompts. */
  prompt: string;
}

export const READING_STYLES: ReadingStyle[] = [
  {
    id: "social_currency",
    zh: "让我在饭桌上讲出来的那种——冷知识、反直觉、让人“等等这是真的吗”",
    en: "The kind I repeat at dinner — counterintuitive, makes people say “wait, is that real?”",
    labelZh: "社交弹药型",
    labelEn: "For the dinner table",
    prompt:
      "prefers surprising, counterintuitive facts they can retell at dinner (social currency)",
  },
  {
    id: "depth_thinker",
    zh: "让我独自消化的那种——深一点,有历史脉络或科学推导",
    en: "The kind I sit with alone — deeper, with historical context or scientific reasoning",
    labelZh: "深读型",
    labelEn: "For sitting with alone",
    prompt:
      "prefers deeper facts with historical context or scientific reasoning to sit with alone",
  },
];

export function readerTypeById(id: string): ReaderType | undefined {
  return READER_TYPES.find((r) => r.id === id);
}

export function readingStyleById(id: string): ReadingStyle | undefined {
  return READING_STYLES.find((s) => s.id === id);
}

/**
 * Resolve Profile.occupation for LLM prompts: reader-type ids become their
 * persona line; legacy free text passes through untouched.
 */
export function occupationForPrompt(occupation: string): string {
  return readerTypeById(occupation)?.prompt ?? occupation;
}

/**
 * Resolve Profile.interests for LLM prompts: reading-style ids become their
 * persona line; legacy comma-separated free text passes through untouched.
 */
export function interestsForPrompt(interests: string): string {
  return readingStyleById(interests)?.prompt ?? interests;
}

/**
 * Whether Profile.interests holds a style id (as opposed to legacy free
 * text). Style ids must NOT be used as Wikipedia search terms.
 */
export function isReadingStyleId(interests: string): boolean {
  return readingStyleById(interests) !== undefined;
}

/** Short display label for the reveal card / Settings; legacy text as-is. */
export function readerTypeLabel(occupation: string, language: AppLanguage): string {
  const r = readerTypeById(occupation);
  if (!r) return occupation;
  return language === "zh" ? r.labelZh : r.labelEn;
}

/** Short display label for the reveal card / Settings; legacy text as-is. */
export function readingStyleLabel(interests: string, language: AppLanguage): string {
  const s = readingStyleById(interests);
  if (!s) return interests;
  return language === "zh" ? s.labelZh : s.labelEn;
}
