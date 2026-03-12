import Link from "next/link";

export default function HomePage() {
  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">KnowTok</p>
        <h2>把论文变成 3-5 分钟就能看完的卡片</h2>
        <p className="muted">
          先登录，再填写你的阅读偏好，系统会基于最新论文生成自然、可控、带来源片段的今日卡片。
        </p>
        <div className="cta-row">
          <Link className="primary-button" href="/auth">
            去登录
          </Link>
          <Link className="secondary-button" href="/onboarding">
            先看偏好设置
          </Link>
        </div>
      </div>
    </section>
  );
}
