import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ohlo — Privacy Policy 隐私政策",
  description: "How Ohlo collects, uses, and protects your data. Ohlo 如何收集、使用与保护你的数据。",
};

// Design-system tokens from DESIGN.md (same values as MarketingPage).
const C = {
  ink900: "#14110D",
  inkLine: "#2A251C",
  inkText: "#EDE3D0",
  inkMuted: "#9A8D74",
  persimmon: "#EC4A24",
} as const;

const LAST_UPDATED = "2026-07-17";
const CONTACT = "hello@ohlo.app";

/**
 * Static bilingual privacy policy — the URL registered in App Store Connect.
 * English first (App Review reads it), Chinese below. Content is grounded in
 * what the code actually does (Supabase auth + user_personas + user_events,
 * server-side LLM proxy, Vercel Analytics on the website); if data practices
 * change, update BOTH language sections and LAST_UPDATED.
 */
export default function PrivacyPage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: C.ink900,
        color: C.inkText,
        fontFamily:
          '-apple-system, "SF Pro Text", "PingFang SC", "Helvetica Neue", Arial, sans-serif',
        lineHeight: 1.7,
      }}
    >
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px 96px" }}>
        <p style={{ color: C.persimmon, letterSpacing: "0.2em", fontSize: 13, marginBottom: 8 }}>
          OHLO · DAILY DISPATCH
        </p>
        <h1 style={{ fontSize: 32, marginBottom: 4 }}>Privacy Policy · 隐私政策</h1>
        <p style={{ color: C.inkMuted, fontSize: 14, marginBottom: 40 }}>
          Last updated / 最近更新: {LAST_UPDATED}
        </p>

        {/* ── English ─────────────────────────────────────────────────── */}
        <Section title="What Ohlo is">
          Ohlo delivers one fact a day from real sources (research papers and public
          datasets) to your phone, widgets, and watch. This policy covers the Ohlo
          mobile app and the ohlo.app website, operated by the Ohlo team
          (&ldquo;we&rdquo;).
        </Section>

        <Section title="What we collect">
          <ul style={{ paddingLeft: 20, display: "grid", gap: 8 }}>
            <li>
              <b>Account:</b> your email address, or the identity provided by Sign in
              with Apple / Google Sign-In, plus an internal account ID. Authentication
              is handled by Supabase.
            </li>
            <li>
              <b>Profile:</b> the answers you give during onboarding and in Settings —
              reader type, reading style, curiosity topics and their weights, optional
              age range, and content language.
            </li>
            <li>
              <b>In-app activity:</b> events such as a fact being shown, swapped
              (换一条), flipped, shared, or its source link tapped — each recording the
              fact&rsquo;s ID, its topic, and the date. We use these to adjust your
              topic weights (a weekly automated process), so what you engage with
              gradually shapes what you receive.
            </li>
            <li>
              <b>Website analytics:</b> ohlo.app uses Vercel Analytics, a cookieless,
              aggregate page-view measurement service. The mobile app contains no
              third-party analytics or advertising SDKs.
            </li>
          </ul>
        </Section>

        <Section title="How we use it">
          Everything we collect serves one purpose: choosing and personalizing your
          daily fact. To write the personalized &ldquo;why this matters to you&rdquo;
          line, a short summary of your profile (reader type, interests, topic) is
          processed by an AI language-model service through our own server. We do not
          sell your data, show ads, or track you across other companies&rsquo; apps or
          websites.
        </Section>

        <Section title="Where it lives">
          Your account, profile, and activity data are stored in our Supabase-hosted
          database. Your daily facts and preferences are also cached on your device
          (and shared with the Ohlo widget and watch app on that device) so the app
          works instantly.
        </Section>

        <Section title="Deleting your data">
          You can request deletion of your account and all associated data at any time
          by emailing <a href={`mailto:${CONTACT}`} style={{ color: C.persimmon }}>{CONTACT}</a>.
          We delete your account record, profile, and activity history. Uninstalling
          the app removes all locally cached data from your device.
        </Section>

        <Section title="Children">
          Ohlo is not directed at children under 13, and we do not knowingly collect
          data from them.
        </Section>

        <Section title="Changes & contact">
          If our data practices change, we will update this page and the date above.
          Questions: <a href={`mailto:${CONTACT}`} style={{ color: C.persimmon }}>{CONTACT}</a>.
        </Section>

        <hr style={{ border: "none", borderTop: `1px solid ${C.inkLine}`, margin: "48px 0" }} />

        {/* ── 中文 ─────────────────────────────────────────────────────── */}
        <Section title="Ohlo 是什么">
          Ohlo 每天从真实来源（科研论文与公开数据集）为你送来一条冷知识，出现在手机、
          桌面组件和手表上。本政策适用于 Ohlo 移动应用与 ohlo.app 网站，由 Ohlo
          团队（下称&ldquo;我们&rdquo;）运营。
        </Section>

        <Section title="我们收集什么">
          <ul style={{ paddingLeft: 20, display: "grid", gap: 8 }}>
            <li>
              <b>账号：</b>你的邮箱地址，或通过 Apple / Google 登录提供的身份信息，
              以及一个内部账号 ID。认证由 Supabase 处理。
            </li>
            <li>
              <b>画像：</b>你在引导问答和设置中给出的回答——读者类型、阅读风格、
              好奇领域及其权重、可选的年龄段、内容语言。
            </li>
            <li>
              <b>应用内行为：</b>展示、换一条、翻面、分享、点击出处链接等事件，
              每条记录该知识的 ID、所属领域和日期。我们用这些信号（每周自动运行一次）
              微调你的领域权重——你实际感兴趣的内容会逐渐影响你收到的内容。
            </li>
            <li>
              <b>网站统计：</b>ohlo.app 使用 Vercel Analytics（无 Cookie 的聚合页面
              访问统计）。移动应用内没有任何第三方统计或广告 SDK。
            </li>
          </ul>
        </Section>

        <Section title="我们如何使用">
          收集的所有数据只服务于一个目的：为你挑选并个性化每日知识。生成
          &ldquo;这跟你有什么关系&rdquo;那句话时，你画像的简短摘要（读者类型、兴趣、
          领域）会经由我们自己的服务器交给 AI 语言模型服务处理。我们不出售你的数据、
          不投放广告、不在其他公司的应用或网站间追踪你。
        </Section>

        <Section title="数据存放在哪里">
          账号、画像与行为数据存储在我们托管于 Supabase 的数据库中。你的每日知识与偏好
          也会缓存在你的设备上（并与该设备上的 Ohlo 组件、手表应用共享），以便应用即开即用。
        </Section>

        <Section title="删除你的数据">
          你可以随时发邮件至{" "}
          <a href={`mailto:${CONTACT}`} style={{ color: C.persimmon }}>{CONTACT}</a>{" "}
          申请删除账号及全部关联数据。我们会删除你的账号记录、画像与行为历史。
          卸载应用即会清除设备上的全部本地缓存。
        </Section>

        <Section title="儿童">
          Ohlo 不面向 13 岁以下儿童，我们也不会有意收集他们的数据。
        </Section>

        <Section title="变更与联系">
          若数据实践发生变化，我们会更新本页面及顶部日期。任何问题请联系：{" "}
          <a href={`mailto:${CONTACT}`} style={{ color: C.persimmon }}>{CONTACT}</a>。
        </Section>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, color: C.inkText, marginBottom: 8 }}>{title}</h2>
      <div style={{ color: C.inkMuted, fontSize: 15 }}>{children}</div>
    </section>
  );
}
