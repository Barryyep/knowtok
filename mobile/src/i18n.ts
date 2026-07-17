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
  deleteAccount: string;
  deleteAccountConfirmTitle: string;
  deleteAccountConfirmBody: string;
  deleteAccountConfirmAction: string;
  deleteAccountCancel: string;
  deleteAccountFailed: string;
  // Profile
  languageLabel: string;
  apiKeyLabel: string;
  save: string;
  // Onboarding — V3.2 quiz flow
  languageScreenTitle: string;
  otherLabel: string;
  otherPlaceholder: string;
  otherConfirm: string;
  otherCancel: string;
  stepBack: string;
  continueLabel: string;
  skipLabel: string;
  singleSelectHint: string;
  multiSelectHint: string;
  nameTitle: string;
  nameSubtitle: string;
  ageTitle: string;
  ageSubtitle: string;
  ageRatherNotSay: string;
  revealSorting: string;
  revealRadarTitle: string;
  revealSpectrumLabel: string;
  revealSurprise: string;
  revealDepth: string;
  revealRhythmLabel: string;
  revealRhythmCracks: string;
  revealRhythmNight: string;
  revealRhythmDefault: string;
  revealFootnote: string;
  revealCta: string;
  // Today
  tabToday: string;
  tabHistory: string;
  tabSettings: string;
  flipFrontHint: string;
  flipBackTitle: string;
  flipBackPending: string;
  flipBackHint: string;
  refresh: string;
  share: string;
  loading: string;
  firstClassSeal: string;
  firstClassExplainer: string;
  errorTitle: string;
  retry: string;
  // Share poster
  shareScanPrompt: string;
  // History
  historyEmpty: string;
  // Settings
  settingsProfile: string;
  settingsWidgetTitle: string;
  settingsWidgetHint: string;
  settingsAbout: string;
  // Radar editor
  radarScreenTitle: string;
  radarGuardHint: string;
  // Streak label — contains {n} placeholder replaced at runtime
  streakLabel: string;
  // Swap gate — shown after MAX_DAILY_SWAPS exhausted
  swapExhausted: string;
}

const en: UIStrings = {
  appName: "Ohlo",
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
  deleteAccount: "Delete account",
  deleteAccountConfirmTitle: "Delete your account?",
  deleteAccountConfirmBody:
    "This permanently deletes your account, profile, and reading history. It cannot be undone.",
  deleteAccountConfirmAction: "Delete permanently",
  deleteAccountCancel: "Cancel",
  deleteAccountFailed: "Deletion failed. Check your connection and try again.",
  // Profile
  languageLabel: "Content language",
  apiKeyLabel: "goodvision API key",
  save: "Save",
  // Onboarding
  languageScreenTitle: "Choose your language",
  otherLabel: "Something else…",
  otherPlaceholder: "Type here",
  otherConfirm: "Done",
  otherCancel: "Back to options",
  stepBack: "Back",
  continueLabel: "Continue",
  skipLabel: "skip",
  singleSelectHint: "Pick one",
  multiSelectHint: "Pick as many as you like",
  nameTitle: "One last thing — what should we call you",
  nameSubtitle: "Blank is fine.",
  ageTitle: "Which stretch of life",
  ageSubtitle: "optional",
  ageRatherNotSay: "Rather not say",
  revealSorting: "Sorting your answers",
  revealRadarTitle: "What pulls you in",
  revealSpectrumLabel: "Taste",
  revealSurprise: "Surprise",
  revealDepth: "Depth",
  revealRhythmLabel: "Rhythm",
  revealRhythmCracks: "One a day · in the cracks",
  revealRhythmNight: "One a day · at night",
  revealRhythmDefault: "One a day",
  revealFootnote: "Not a verdict. It shifts with what you read.",
  revealCta: "See today's",
  // Today
  tabToday: "Today",
  tabHistory: "History",
  tabSettings: "Settings",
  flipFrontHint: "Why it found you",
  flipBackTitle: "Why it found you",
  flipBackPending: "Writing this one for you…",
  flipBackHint: "Flip back",
  refresh: "Another one",
  share: "Share",
  loading: "Picking today's paper…",
  firstClassSeal: "FIRST CLASS",
  firstClassExplainer:
    "First Class = knowledge from a real paper published today; standard slips come from the general library. The № is this slip's collector's number.",
  errorTitle: "Couldn't load today's fact",
  retry: "Retry",
  // Share poster
  shareScanPrompt: "Scan to keep this one",
  // History
  historyEmpty: "Your past daily facts will appear here.",
  // Settings
  settingsProfile: "Profile",
  settingsWidgetTitle: "Widgets & watch",
  settingsWidgetHint:
    "Add the Ohlo widget to your home or lock screen — and your watch face.",
  settingsAbout: "Ohlo · facts from arXiv papers, personalized for you",
  // Radar editor
  radarScreenTitle: "My curiosity radar",
  radarGuardHint: "Keep at least 2 domains active",
  streakLabel: "DAY {n}",
  // Swap gate
  swapExhausted: "One a day. The next lands tomorrow.",
};

const zh: UIStrings = {
  appName: "Ohlo",
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
  deleteAccount: "删除账号",
  deleteAccountConfirmTitle: "确定删除账号？",
  deleteAccountConfirmBody: "将永久删除你的账号、画像与阅读记录，无法恢复。",
  deleteAccountConfirmAction: "永久删除",
  deleteAccountCancel: "取消",
  deleteAccountFailed: "删除失败，请检查网络后重试。",
  // Profile
  languageLabel: "内容语言",
  apiKeyLabel: "goodvision API key",
  save: "保存",
  // Onboarding
  languageScreenTitle: "选择语言",
  otherLabel: "其他…",
  otherPlaceholder: "写在这里",
  otherConfirm: "好",
  otherCancel: "返回选项",
  stepBack: "返回",
  continueLabel: "继续",
  skipLabel: "跳过",
  singleSelectHint: "单选一个",
  multiSelectHint: "可以多选",
  nameTitle: "最后一件事:怎么称呼你",
  nameSubtitle: "可以留空。",
  ageTitle: "你在哪个人生阶段",
  ageSubtitle: "可选",
  ageRatherNotSay: "不想说",
  revealSorting: "在整理你的答案",
  revealRadarTitle: "你的好奇雷达",
  revealSpectrumLabel: "口味",
  revealSurprise: "惊奇",
  revealDepth: "深读",
  revealRhythmLabel: "节奏",
  revealRhythmCracks: "每天一条 · 缝隙时间",
  revealRhythmNight: "每天一条 · 夜晚",
  revealRhythmDefault: "每天一条",
  revealFootnote: "这不是结论。你读什么,它就跟着变。",
  revealCta: "看今天这条",
  // Today
  tabToday: "今日",
  tabHistory: "历史",
  tabSettings: "设置",
  flipFrontHint: "寄给你的理由",
  flipBackTitle: "寄给你的理由",
  flipBackPending: "正在为你写这一段…",
  flipBackHint: "翻回正面",
  refresh: "换一条",
  share: "分享",
  loading: "正在为你挑选今天的论文…",
  firstClassSeal: "FIRST CLASS · 头等件",
  firstClassExplainer:
    "头等件 = 来自当日真实论文的知识,普通件来自通识库。编号是这张信笺的收藏号。",
  errorTitle: "获取今日冷知识失败",
  retry: "重试",
  // Share poster
  shareScanPrompt: "扫码收下这条",
  // History
  historyEmpty: "你看过的每日冷知识会出现在这里。",
  // Settings
  settingsProfile: "个人画像",
  settingsWidgetTitle: "组件与手表",
  settingsWidgetHint: "把 Ohlo 组件添加到主屏幕、锁屏和手表表盘。",
  settingsAbout: "Ohlo · 冷知识来自 arXiv 论文,为你个性化解读",
  // Radar editor
  radarScreenTitle: "我的好奇雷达",
  radarGuardHint: "至少保留 2 个领域",
  streakLabel: "连续 {n} 天",
  // Swap gate
  swapExhausted: "明天再来一封 · 好东西值得等",
};

const UI_TEXT: Record<AppLanguage, UIStrings> = { en, zh };

export function t(language: AppLanguage): UIStrings {
  return UI_TEXT[language];
}
