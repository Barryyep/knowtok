import { getLocales } from "expo-localization";

import type { AppLanguage } from "./lib/types";

/** Default content language from the system locale. */
export function systemLanguage(): AppLanguage {
  return getLocales()[0]?.languageCode === "zh" ? "zh" : "en";
}

export const UI_TEXT = {
  en: {
    appName: "KnowTok Daily",
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
    // Today
    tabToday: "Today",
    tabHistory: "History",
    tabSettings: "Settings",
    todayLabel: "TODAY",
    whyCareLabel: "Why you'd care",
    whyCarePending: "Writing your personal take…",
    refresh: "Another one",
    sourceLabel: "SOURCE",
    readPaper: "Read on arXiv",
    loading: "Picking today's paper…",
    widgetHint: "Add the KnowTok widget to your home or lock screen — and your watch face.",
    errorTitle: "Couldn't load today's fact",
    retry: "Retry",
    // History
    historyEmpty: "Your past daily facts will appear here.",
    // Settings
    settingsProfile: "Profile",
    settingsAbout: "KnowTok Daily · facts from arXiv papers, personalized for you",
  },
  zh: {
    appName: "KnowTok Daily",
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
    // Today
    tabToday: "今日",
    tabHistory: "历史",
    tabSettings: "设置",
    todayLabel: "今日",
    whyCareLabel: "跟你有什么关系",
    whyCarePending: "正在为你写个性化解读…",
    refresh: "换一条",
    sourceLabel: "出处",
    readPaper: "在 arXiv 阅读原文",
    loading: "正在为你挑选今天的论文…",
    widgetHint: "把 KnowTok 组件添加到主屏幕、锁屏和手表表盘。",
    errorTitle: "获取今日冷知识失败",
    retry: "重试",
    // History
    historyEmpty: "你看过的每日冷知识会出现在这里。",
    // Settings
    settingsProfile: "个人画像",
    settingsAbout: "KnowTok Daily · 冷知识来自 arXiv 论文,为你个性化解读",
  },
} as const;

export type UIStrings = (typeof UI_TEXT)[AppLanguage];

export function t(language: AppLanguage): UIStrings {
  return UI_TEXT[language];
}
