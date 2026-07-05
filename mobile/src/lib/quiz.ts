/**
 * The onboarding quiz engine — a disguised questionnaire (V3.2, see
 * docs/onboarding-v3-proposal.md). Everyday-trivia questions cast weighted
 * hidden votes ("暗票", 0.5), six adaptive card rounds cast behavior votes
 * (1, finals 2), and the merged ledger becomes the curiosity radar. Pure
 * functions throughout; the UI threads QuizState through the flow.
 *
 * SPARKS supplies the cards: cards for a domain are consumed in array
 * order, cycling if a domain runs out (content target is 4 per domain).
 */
import { SPARKS, type Spark } from "./taxonomy";

export type ReadingMoment = "cracks" | "night";
export type StyleId = "social_currency" | "depth_thinker";

export interface QuizOption {
  id: string;
  zh: string;
  en: string;
  /** Hidden ledger: weighted domain votes this answer casts (total ~0.5). */
  domainVotes?: Record<string, number>;
  styleVote?: StyleId;
  momentVote?: ReadingMoment;
  /** ReaderType id (onboarding.ts) for the occupation question. */
  occupationVote?: string;
}

export type QuizItem =
  | { kind: "name" }
  /** One-line interstitial; fades in and auto-advances. */
  | { kind: "note"; zh: string; en: string }
  | {
      kind: "choice";
      id: string;
      zh: string;
      en: string;
      options: QuizOption[];
      skippable?: boolean;
    }
  | { kind: "cards"; round: number }
  | { kind: "age" };

export const CARD_ROUNDS = 6;

/**
 * Per-round card prompts — varied so the deck reads as conversation, not a
 * transaction ("which would you open" ×6 felt too direct). Rounds 4/5 match
 * their mechanics: 4 is the wildcard round, 5 the finals.
 */
export const CARD_PROMPTS: { zh: string; en: string }[] = [
  { zh: "哪一条,你想刨根问底", en: "Which one would you want to get to the bottom of" },
  { zh: "哪条会让你多看一眼", en: "Which one would earn a second look" },
  { zh: "哪个你会讲给别人听", en: "Which one would you retell" },
  { zh: "哪条让你有点意外", en: "Which one surprises you a little" },
  { zh: "都不太熟?挑一个最想弄懂的", en: "Unfamiliar ground. Pick the one you'd want explained" },
  { zh: "只留一条,留哪条", en: "Keep only one. Which" },
];

export const QUIZ_SEQUENCE: QuizItem[] = [
  {
    kind: "note",
    zh: "几个小问题,随便答,没有对错。",
    en: "A few small questions. No right answers.",
  },
  {
    kind: "choice",
    id: "album",
    zh: "翻你的相册,除了人,更多的是",
    en: "In your camera roll, besides people, there's mostly",
    options: [
      { id: "food", zh: "吃的,和吃过的店", en: "Food, and places you ate", domainVotes: { food: 0.5 } },
      {
        id: "sky",
        zh: "天空、路上随手拍的东西",
        en: "Sky, and things you passed",
        domainVotes: { nature: 0.25, space: 0.25 },
      },
      { id: "shots", zh: "各种截图", en: "Screenshots", domainVotes: { tech_ai: 0.5 } },
    ],
  },
  {
    kind: "choice",
    id: "checkup",
    zh: "体检报告出来,你通常",
    en: "When a health checkup report comes back, you usually",
    options: [
      {
        id: "dig",
        zh: "会把不懂的指标一个个查明白",
        en: "Look up every number you don't recognize",
        domainVotes: { health: 0.5 },
        styleVote: "depth_thinker",
      },
      {
        id: "scan",
        zh: "扫一眼结论,没大事就收起来",
        en: "Scan the summary and file it away",
      },
    ],
  },
  {
    kind: "choice",
    id: "awake",
    zh: "睡不着的时候,脑子里更常转的是",
    en: "Lying awake at night, your head is usually on",
    options: [
      {
        id: "questions",
        zh: "一些没用但有意思的问题",
        en: "Useless but interesting questions",
        domainVotes: { mind: 0.25, space: 0.25 },
      },
      {
        id: "people",
        zh: "白天的人和事",
        en: "People, and things that happened today",
        domainVotes: { society: 0.5 },
      },
      {
        id: "practical",
        zh: "账单、计划这些实际的",
        en: "Bills, plans, practical things",
        domainVotes: { money: 0.5 },
      },
    ],
  },
  {
    kind: "choice",
    id: "spare",
    zh: "难得空出来的半天,你更可能",
    en: "Half a day frees up. You'd probably",
    options: [
      {
        id: "wander",
        zh: "出门走走,哪怕没有目的地",
        en: "Go out and wander, no destination",
        domainVotes: { nature: 0.25, climate: 0.25 },
      },
      {
        id: "tinker",
        zh: "捣鼓手机、电脑或什么设备",
        en: "Tinker with a phone, computer, or some gadget",
        domainVotes: { tech_ai: 0.5 },
      },
      {
        id: "cook",
        zh: "认认真真做一顿饭",
        en: "Cook something proper",
        domainVotes: { food: 0.5 },
      },
      {
        id: "read",
        zh: "窝着翻点有意思的东西",
        en: "Curl up with something interesting",
        domainVotes: { mind: 0.25, history: 0.25 },
      },
    ],
  },
  {
    kind: "choice",
    id: "stop",
    zh: "躺着刷手机,哪种东西最容易让你停下来",
    en: "Scrolling in bed, what actually stops your thumb",
    options: [
      {
        id: "number",
        zh: "一个反常识的数字",
        en: "A number that shouldn't be true",
        styleVote: "social_currency",
      },
      {
        id: "principle",
        zh: "一段讲得特别清楚的原理",
        en: "A principle explained perfectly",
        styleVote: "depth_thinker",
      },
      { id: "breaking", zh: "一件正在发生的大事", en: "Something big happening right now" },
    ],
  },
  { kind: "cards", round: 0 },
  { kind: "cards", round: 1 },
  { kind: "cards", round: 2 },
  { kind: "cards", round: 3 },
  { kind: "cards", round: 4 },
  { kind: "cards", round: 5 },
  {
    kind: "choice",
    id: "telling",
    zh: "朋友非要给你讲一个“改变他世界观”的事。你希望他",
    en: "A friend insists on telling you something that “changed how they see everything.” You'd rather they",
    options: [
      {
        id: "punchline",
        zh: "一句话说完重点,惊到就行",
        en: "Land the punchline in one line",
        styleVote: "social_currency",
      },
      {
        id: "fullstory",
        zh: "从头讲清楚来龙去脉",
        en: "Walk you through it from the start",
        styleVote: "depth_thinker",
      },
    ],
  },
  {
    kind: "choice",
    id: "moment",
    zh: "这种闲逛式的看东西,你最常发生在",
    en: "This kind of idle reading mostly happens",
    options: [
      {
        id: "cracks",
        zh: "通勤、排队、等人的缝隙里",
        en: "In the cracks — commutes, queues",
        momentVote: "cracks",
      },
      {
        id: "night",
        zh: "晚上安静下来之后",
        en: "Late, once things go quiet",
        momentVote: "night",
      },
    ],
  },
  {
    kind: "choice",
    id: "workday",
    zh: "不管做什么,你一天里打交道最多的是",
    en: "Whatever the job, most of your day is spent with",
    options: [
      {
        id: "screens",
        zh: "数据、报表和屏幕",
        en: "Data, dashboards, screens",
        domainVotes: { tech_ai: 0.25, money: 0.25 },
      },
      {
        id: "people",
        zh: "人,和人的事",
        en: "People, and people problems",
        domainVotes: { society: 0.25, mind: 0.25 },
      },
      {
        id: "things",
        zh: "实际的东西:场地、设备、货",
        en: "Physical things: sites, gear, goods",
        domainVotes: { climate: 0.25, nature: 0.25 },
      },
      {
        id: "words",
        zh: "文字和想法",
        en: "Words and ideas",
        domainVotes: { history: 0.25, mind: 0.25 },
      },
    ],
  },
  {
    kind: "choice",
    id: "days",
    zh: "平常的日子,更像下面哪一种",
    en: "Most days look like",
    options: [
      {
        id: "professional",
        zh: "会议和截止日期",
        en: "Meetings and deadlines",
        occupationVote: "professional",
      },
      { id: "student", zh: "课表和考试", en: "Classes and exams", occupationVote: "student" },
      {
        id: "homemaker",
        zh: "家和孩子的日程",
        en: "The family calendar",
        occupationVote: "homemaker",
      },
      { id: "other", zh: "都不太像", en: "None of these", occupationVote: "other" },
    ],
  },
  { kind: "age" },
  // Name comes LAST — by now the user has answered everything, so a "what
  // should we call you" reads as sign-off, not intake form (founder call).
  { kind: "name" },
];

// ---------------------------------------------------------------------------
// Hidden ledger + adaptive card table
// ---------------------------------------------------------------------------

const CLUSTERS: string[][] = [
  ["tech_ai", "space", "money"],
  ["health", "mind", "food"],
  ["history", "society", "climate", "nature"],
];

/** Deterministic tiebreak order. */
const PRIORITY = [
  "tech_ai",
  "health",
  "history",
  "space",
  "mind",
  "society",
  "money",
  "food",
  "climate",
  "nature",
];

export interface QuizState {
  /** Merged weighted domain scores. */
  scores: Record<string, number>;
  /** Domain picked in each completed card round. */
  cardPicks: string[];
  /** Domains that have appeared on the card table. */
  dealt: string[];
  /** Cards spent per domain (index into its SPARKS entries). */
  used: Record<string, number>;
  styleVotes: StyleId[];
}

export function initialQuizState(): QuizState {
  return { scores: {}, cardPicks: [], dealt: [], used: {}, styleVotes: [] };
}

/** Apply a trivia/finetune answer's hidden votes. */
export function applyChoice(state: QuizState, option: QuizOption): QuizState {
  const scores = { ...state.scores };
  for (const [d, w] of Object.entries(option.domainVotes ?? {})) {
    scores[d] = (scores[d] ?? 0) + w;
  }
  return {
    ...state,
    scores,
    styleVotes: option.styleVote ? [...state.styleVotes, option.styleVote] : state.styleVotes,
  };
}

function score(state: QuizState, d: string): number {
  return state.scores[d] ?? 0;
}

/** Sort best-first: score desc, then fixed priority. */
function rank(state: QuizState, ids: string[]): string[] {
  return [...ids].sort(
    (a, b) => score(state, b) - score(state, a) || PRIORITY.indexOf(a) - PRIORITY.indexOf(b),
  );
}

function clusterOf(d: string): string[] {
  return CLUSTERS.find((c) => c.includes(d)) ?? [];
}

function nextCard(state: QuizState, d: string): Spark {
  const cards = SPARKS.filter((s) => s.domainId === d);
  return cards[(state.used[d] ?? 0) % cards.length];
}

/** The three domains on the table for a round. Pure; see doc §3 for shape. */
function roundDomains(state: QuizState, round: number): string[] {
  const ranked = rank(state, PRIORITY);
  if (round === 0) {
    // Probe: best-scored domain of each cluster.
    return CLUSTERS.map((c) => rank(state, c)[0]);
  }
  if (round === 1) {
    // Coverage: undealt domains, spread across clusters where possible.
    const undealt = ranked.filter((d) => !state.dealt.includes(d));
    const picked: string[] = [];
    for (const c of CLUSTERS) {
      const hit = undealt.find((d) => c.includes(d) && !picked.includes(d));
      if (hit) picked.push(hit);
    }
    for (const d of undealt) {
      if (picked.length === 3) break;
      if (!picked.includes(d)) picked.push(d);
    }
    return picked.slice(0, 3);
  }
  if (round === 2 || round === 3) {
    // Deepen: confirm the current #1 (or #2) against its cluster neighbors.
    const target = ranked[round - 2];
    const neighbors = rank(
      state,
      clusterOf(target).filter((d) => d !== target),
    ).slice(0, 2);
    // World cluster has 4 members; 3-member clusters always yield exactly 2.
    while (neighbors.length < 2) {
      const filler = ranked.find((d) => d !== target && !neighbors.includes(d));
      if (!filler) break;
      neighbors.push(filler);
    }
    return [target, ...neighbors];
  }
  if (round === 4) {
    // Wildcard: three lowest-scored domains get their strongest shot.
    return rank(state, PRIORITY).reverse().slice(0, 3);
  }
  // Finals: top three, double points.
  return ranked.slice(0, 3);
}

/** Deal a round: returns the trio and the state with those cards spent. */
export function dealRound(
  state: QuizState,
  round: number,
): { trio: Spark[]; state: QuizState } {
  const domains = roundDomains(state, round);
  const trio = domains.map((d) => nextCard(state, d));
  const used = { ...state.used };
  const dealt = [...state.dealt];
  for (const d of domains) {
    used[d] = (used[d] ?? 0) + 1;
    if (!dealt.includes(d)) dealt.push(d);
  }
  return { trio, state: { ...state, used, dealt } };
}

/** Apply a card pick: +1, finals +2. */
export function applyCardPick(state: QuizState, domainId: string, round: number): QuizState {
  const scores = { ...state.scores };
  scores[domainId] = (scores[domainId] ?? 0) + (round === CARD_ROUNDS - 1 ? 2 : 1);
  return { ...state, scores, cardPicks: [...state.cardPicks, domainId] };
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export interface RadarDomain {
  id: string;
  /** 0..1, relative to the strongest domain — the radar bar length. */
  strength: number;
}

export interface QuizResult {
  /** Best-first, 2-4 entries, only domains with real signal. */
  domains: RadarDomain[];
  style: StyleId;
}

export function quizResult(state: QuizState): QuizResult {
  const entries = rank(
    state,
    PRIORITY.filter((d) => score(state, d) > 0),
  ).slice(0, 4);
  const max = entries.length ? score(state, entries[0]) : 1;
  return {
    domains: entries.map((id) => ({ id, strength: score(state, id) / max })),
    // Q11 is pushed last, so the latest vote resolves any disagreement.
    style: state.styleVotes[state.styleVotes.length - 1] ?? "social_currency",
  };
}
