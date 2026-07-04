import { getLocales } from "expo-localization";

import type { AppLanguage } from "./lib/types";

/** Default content language from the system locale. */
export function systemLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode === "zh" ? "zh" : "en";
}

/**
 * The full set of UI strings for one locale. Every locale object must satisfy
 * this shape, so adding a language later (ja/es/…) is just one more object the
 * compiler will force you to complete. Screens keep calling `t(language)`.
 */
export interface UIStrings {
  appName: string;
  tagline: string;
  // Auth
  welcomeTitle: string;
  welcomeSubtitle: string;
  email: string;
  password: string;
  signIn: string;
  signUp: string;
  switchToSignUp: string;
  switchToSignIn: string;
  orDivider: string;
  continueWithGoogle: string;
  checkEmail: string;
  signOut: string;
  // Profile
  profileTitle: string;
  profileSubtitle: string;
  nameLabel: string;
  namePlaceholder: string;
  occupationLabel: string;
  occupationPlaceholder: string;
  interestsLabel: string;
  interestsPlaceholder: string;
  languageLabel: string;
  apiKeyLabel: string;
  save: string;
  startDaily: string;
  needProfile: string;
  // Onboarding — multi-step curiosity flow
  stepBack: string;
  continueLabel: string;
  // Step 1 — 好奇心测定
  curiosityTitle: string;
  curiositySubtitle: string;
  curiosityGateHint: string;
  curiosityDomainsLead: string;
  // Step 2 — 这是写给谁的信
  aboutTitle: string;
  aboutSubtitle: string;
  aboutWhyLine: string;
  // Step 3 — 收信偏好
  prefsTitle: string;
  prefsSubtitle: string;
  ageRangeLabel: string;
  startDispatches: string;
  // Today
  tabToday: string;
  tabHistory: string;
  tabSettings: string;
  todayLabel: string;
  whyCareLabel: string;
  whyCarePending: string;
  refresh: string;
  share: string;
  sourceLabel: string;
  readPaper: string;
  loading: string;
  firstClassSeal: string;
  firstClassExplainer: string;
  errorTitle: string;
  retry: string;
  // History
  historyEmpty: string;
  // Settings
  settingsProfile: string;
  settingsWidgetTitle: string;
  settingsWidgetHint: string;
  settingsAbout: string;
}

const en: UIStrings = {
  appName: "Ohlo",
  tagline: "One research fact a day, made for you",
  // Auth
  welcomeTitle: "Research,\nmade personal.",
  welcomeSubtitle:
    "Every day, one finding from a real paper — picked for you, explained simply, with the source attached.",
  email: "Email",
  password: "Password",
  signIn: "Sign in",
  signUp: "Create account",
  switchToSignUp: "New here? Create an account",
  switchToSignIn: "Already have an account? Sign in",
  orDivider: "or",
  continueWithGoogle: "Continue with Google",
  checkEmail: "Check your inbox to confirm your email, then sign in.",
  signOut: "Sign out",
  // Profile
  profileTitle: "Who is this for?",
  profileSubtitle: "Facts are picked and explained based on what you do and love.",
  nameLabel: "Name (optional)",
  namePlaceholder: "e.g. Barry",
  occupationLabel: "What do you do?",
  occupationPlaceholder: "e.g. backend engineer",
  interestsLabel: "What are you into?",
  interestsPlaceholder: "e.g. coffee, space, tennis",
  languageLabel: "Content language",
  apiKeyLabel: "goodvision API key",
  save: "Save",
  startDaily: "Start my daily facts",
  needProfile: "Add your occupation or at least one interest.",
  // Onboarding — multi-step curiosity flow
  stepBack: "Back",
  continueLabel: "Continue",
  // Step 1
  curiosityTitle: "What makes you stop scrolling?",
  curiositySubtitle: "Tap the ones you'd actually open.",
  curiosityGateHint: "Pick sparks from at least 2 different areas.",
  curiosityDomainsLead: "Your curiosity so far",
  // Step 2
  aboutTitle: "Who is this letter for?",
  aboutSubtitle: "A little context sharpens how each fact is explained for you.",
  aboutWhyLine: "Your work and hobbies are only used to write the “why it matters to you” line.",
  // Step 3
  prefsTitle: "Delivery preferences",
  prefsSubtitle: "Last touches before your first dispatch arrives.",
  ageRangeLabel: "Your age range (optional)",
  startDispatches: "Start my dispatches",
  // Today
  tabToday: "Today",
  tabHistory: "History",
  tabSettings: "Settings",
  todayLabel: "TODAY",
  whyCareLabel: "Why you'd care",
  whyCarePending: "Writing your personal take…",
  refresh: "Another one",
  share: "Share",
  sourceLabel: "SOURCE",
  readPaper: "Read on arXiv",
  loading: "Picking today's paper…",
  firstClassSeal: "FIRST CLASS",
  firstClassExplainer:
    "First Class = knowledge from a real paper published today; standard slips come from the general library. The № is this slip's collector's number.",
  errorTitle: "Couldn't load today's fact",
  retry: "Retry",
  // History
  historyEmpty: "Your past daily facts will appear here.",
  // Settings
  settingsProfile: "Profile",
  settingsWidgetTitle: "Widgets & watch",
  settingsWidgetHint:
    "Add the Ohlo widget to your home or lock screen — and your watch face.",
  settingsAbout: "Ohlo · facts from arXiv papers, personalized for you",
};

const zh: UIStrings = {
  appName: "Ohlo",
  tagline: "每天一条,来自真实论文的冷知识",
  // Auth
  welcomeTitle: "科研发现,\n为你而来。",
  welcomeSubtitle: "每天从真实论文里为你挑一条发现,讲得通俗易懂,并附上出处。",
  email: "邮箱",
  password: "密码",
  signIn: "登录",
  signUp: "注册",
  switchToSignUp: "第一次来?注册账号",
  switchToSignIn: "已有账号?去登录",
  orDivider: "或",
  continueWithGoogle: "使用 Google 继续",
  checkEmail: "请查收邮箱完成验证,然后回来登录。",
  signOut: "退出登录",
  // Profile
  profileTitle: "这是为谁定制的?",
  profileSubtitle: "根据你的职业和爱好,挑选并解读每天的发现。",
  nameLabel: "名字(可选)",
  namePlaceholder: "比如 Barry",
  occupationLabel: "你是做什么的?",
  occupationPlaceholder: "比如 后端工程师",
  interestsLabel: "你的兴趣爱好?",
  interestsPlaceholder: "比如 咖啡、航天、网球",
  languageLabel: "内容语言",
  apiKeyLabel: "goodvision API key",
  save: "保存",
  startDaily: "开始我的每日冷知识",
  needProfile: "请至少填写职业或一个兴趣爱好。",
  // Onboarding — 多步好奇心引导
  stepBack: "返回",
  continueLabel: "继续",
  // Step 1
  curiosityTitle: "什么会让你停下来?",
  curiositySubtitle: "点亮你会想点开的那些。",
  curiosityGateHint: "至少点亮 2 个不同领域的信笺。",
  curiosityDomainsLead: "你亮起的领域",
  // Step 2
  aboutTitle: "这是写给谁的信",
  aboutSubtitle: "一点背景,能让每条解读更贴近你。",
  aboutWhyLine: "职业和爱好只用来写「跟你有什么关系」那一句。",
  // Step 3
  prefsTitle: "收信偏好",
  prefsSubtitle: "在第一封信笺寄出前,最后几笔。",
  ageRangeLabel: "你的年龄段(可选)",
  startDispatches: "开始收信",
  // Today
  tabToday: "今日",
  tabHistory: "历史",
  tabSettings: "设置",
  todayLabel: "今日",
  whyCareLabel: "跟你有什么关系",
  whyCarePending: "正在为你写个性化解读…",
  refresh: "换一条",
  share: "分享",
  sourceLabel: "出处",
  readPaper: "在 arXiv 阅读原文",
  loading: "正在为你挑选今天的论文…",
  firstClassSeal: "FIRST CLASS · 头等件",
  firstClassExplainer:
    "头等件 = 来自当日真实论文的知识,普通件来自通识库。编号是这张信笺的收藏号。",
  errorTitle: "获取今日冷知识失败",
  retry: "重试",
  // History
  historyEmpty: "你看过的每日冷知识会出现在这里。",
  // Settings
  settingsProfile: "个人画像",
  settingsWidgetTitle: "组件与手表",
  settingsWidgetHint: "把 Ohlo 组件添加到主屏幕、锁屏和手表表盘。",
  settingsAbout: "Ohlo · 冷知识来自 arXiv 论文,为你个性化解读",
};

const UI_TEXT: Record<AppLanguage, UIStrings> = { en, zh };

export function t(language: AppLanguage): UIStrings {
  return UI_TEXT[language];
}
