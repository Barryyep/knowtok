import type { DomainKey, HumanCategory } from "@/types/domain";

export const DOMAIN_OPTIONS: Array<{ key: DomainKey; label: string }> = [
  { key: "cs", label: "CS" },
  { key: "physics", label: "Physics" },
  { key: "math", label: "Math" },
  { key: "q-bio", label: "Q-Bio" },
  { key: "q-fin", label: "Q-Fin" },
  { key: "econ", label: "Econ" },
  { key: "astro-ph", label: "Astro" },
];

export const CATEGORY_OPTIONS: Array<{ key: HumanCategory; label: string }> = [
  { key: "AI & Robots", label: "AI & Robots" },
  { key: "Your Health", label: "Your Health" },
  { key: "Your Money", label: "Your Money" },
  { key: "Your Food", label: "Your Food" },
  { key: "Climate", label: "Climate" },
];

export const CURIOSITY_TAGS = [
  "AI & Robots",
  "Your Health",
  "Your Money",
  "Your Food",
  "Climate",
  "Space",
  "Energy",
] as const;

export const TAG_TO_CATEGORY: Record<string, HumanCategory> = {
  "AI & Robots": "AI & Robots",
  "Your Health": "Your Health",
  "Your Money": "Your Money",
  "Your Food": "Your Food",
  "Climate": "Climate",
};

export const IMPACT_PROMPT_VERSION = "impact_v1";
export const HOOK_PROMPT_VERSION = "hook_v2";

export const UI_TEXT = {
  en: {
    forYou: "For You",
    aiRobots: "AI & Robots",
    yourHealth: "Your Health",
    yourMoney: "Your Money",
    yourFood: "Your Food",
    climate: "Climate",
    loading: "Loading your feed...",
    personalizing: "Personalizing your feed...",
    noResults: "No papers available",
    emptyCategory: (cat: string) => `No ${cat} papers today — here's what's trending in For You!`,
    switchToForYou: "Switch to For You",
    tapToLearnMore: "Tap to learn more",
    tapToFlipBack: "Tap card to flip back",
    whyThisMatters: "Why this matters to you",
    whatThisMeans: "What this means for my life",
    save: "Save",
    saved: "Saved",
    skip: "Skip",
    share: "Share",
    viewOnArxiv: "View on arXiv",
    published: "Published",
    loadingMore: "Loading more papers...",
    // Onboarding
    tellUsAboutYou: "Tell us about you",
    onboardingSubtitle: "We'll use this to explain why each discovery matters to your life — not just to scientists.",
    jobTitle: "What do you do?",
    location: "Where do you live?",
    ageRange: "Age range",
    curiosityTags: "What are you curious about?",
    industry: "Industry",
    skills: "Skills",
    interests: "Interests",
    notes: "Notes",
    resume: "Resume (optional)",
    saveProfile: "Save Profile",
    // Profile
    profile: "Profile",
    feed: "Feed",
    savedPapers: "Saved",
    // Language
    language: "Language",
  },
  zh: {
    forYou: "为你推荐",
    aiRobots: "AI & 机器人",
    yourHealth: "健康生活",
    yourMoney: "财经金融",
    yourFood: "食品科学",
    climate: "气候环境",
    loading: "正在加载你的信息流...",
    personalizing: "正在为你个性化推荐...",
    noResults: "暂无论文",
    emptyCategory: (cat: string) => `今天没有${cat}相关的论文 — 看看为你推荐的内容吧！`,
    switchToForYou: "切换到为你推荐",
    tapToLearnMore: "点击了解更多",
    tapToFlipBack: "点击翻回正面",
    whyThisMatters: "为什么这对你重要",
    whatThisMeans: "这对我的生活意味着什么",
    save: "收藏",
    saved: "已收藏",
    skip: "跳过",
    share: "分享",
    viewOnArxiv: "在 arXiv 上查看",
    published: "发表于",
    loadingMore: "加载更多...",
    // Onboarding
    tellUsAboutYou: "告诉我们你是谁",
    onboardingSubtitle: "我们会用这些信息来解释每个新发现与你的生活有什么关系 — 不只是给科学家看的。",
    jobTitle: "你的职业是？",
    location: "你住在哪里？",
    ageRange: "年龄段",
    curiosityTags: "你对什么感兴趣？",
    industry: "行业",
    skills: "技能",
    interests: "兴趣",
    notes: "备注",
    resume: "简历（可选）",
    saveProfile: "保存",
    // Profile
    profile: "个人中心",
    feed: "发现",
    savedPapers: "收藏",
    // Language
    language: "语言",
  },
} as const;

export type AppLanguage = "en" | "zh";
