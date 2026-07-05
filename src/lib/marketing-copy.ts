/**
 * marketing-copy.ts — single source of truth for all homepage strings.
 *
 * zh: primary Chinese text (Songti SC / system serif)
 * en: primary English text (Fraunces)
 *
 * Rules:
 *  - No emoji, no exclamation marks.
 *  - Deadpan register in both languages.
 *  - en headings are promoted from what were previously Fraunces italic sublines.
 */

export type Locale = "zh" | "en";

export const COPY = {
  zh: {
    metaTitle: "Ohlo — 每日信笺",
    metaDescription:
      "印在你的锁屏和桌面上，来自真实的论文与数据，盖着出处的邮戳。",
    headerWordmark: "OHLO",
    headerRight: "每日信笺",
    heroHeadline: "每天一条，值得停下来的知识。",
    heroDelivery:
      "印在你的锁屏和桌面上，来自真实的论文与数据，盖着出处的邮戳。",
    ctaButton: "获取 Ohlo",
    ctaComingSoon: "App Store · 即将上线",
    footerLeft: "OHLO · 每日信笺",
    comp1Head: "每天只有一条。不是无限的流，是一封信。",
    comp1Body:
      "每天清晨，一条值得停下来的知识出现在你的锁屏上。不是一百条里选一条，是直接送达那一条。组件上门，不用打开 app，信就已经在那里了。",
    comp2Head: "AI 好奇雷达",
    comp2Body:
      "好奇雷达从你的测验人设出发，找出当天最可能让你发呆三秒钟的那条。不是黑箱在猜，是你告诉它你对什么感兴趣，它按你说的选。",
    comp3Head: "为什么跟你有关",
    comp3Body:
      "每条信笺都附带一句「为什么这条跟你有关」。不是背景介绍，是直接告诉你：这件事和你的生活有什么关系。",
    comp4Head: "真实来源",
    comp4Body:
      "每条都盖出处邮戳。论文轨是当天的真论文，不是 AI 合成的摘要。来源不是脚注，是签名。",
    widgetFact: "大脑仅占体重的2%，却消耗全身约20%的能量。",
    widgetSource: "综合知识",
    zoomLabel: "为什么这条跟你有关",
    toggleLabel: "EN",
    toggleHref: "/en",
  },
  en: {
    metaTitle: "Ohlo — Daily Dispatch",
    metaDescription:
      "Delivered to your lock screen and home screen, from real papers and data, stamped with its source.",
    headerWordmark: "OHLO",
    headerRight: "DAILY DISPATCH",
    heroHeadline: "One thing worth stopping for, every day.",
    heroDelivery:
      "Delivered to your lock screen and home screen, from real papers and data, stamped with its source.",
    ctaButton: "Get Ohlo",
    ctaComingSoon: "App Store · coming soon",
    footerLeft: "OHLO · DAILY DISPATCH",
    comp1Head: "One a day. Not a feed, a letter.",
    comp1Body:
      "Every morning a single dispatch lands on your lock screen. No scrolling, no app to open. The widget is the delivery.",
    comp2Head: "The radar picks the one thing you'd stop for.",
    comp2Body:
      "A quiz-derived curiosity profile tells the system what kind of mind you carry. No black box: the radar follows your lead.",
    comp3Head: "Why you'd care.",
    comp3Body:
      "Every dispatch includes a why-you'd-care line. Not a summary, not a citation. A direct connection to your life.",
    comp4Head: "Real sources, stamped.",
    comp4Body:
      "Every dispatch carries a source stamp. The paper trail is the day's real paper. Not a footnote: a signature.",
    widgetFact: "The brain is 2% of body weight but uses 20% of its energy.",
    widgetSource: "General Knowledge",
    zoomLabel: "why you'd care",
    toggleLabel: "中文",
    toggleHref: "/zh",
  },
} as const;
