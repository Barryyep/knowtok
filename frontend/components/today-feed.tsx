"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { fetchPersonalizedHook, fetchTodayCards, PersonalizedHook, TodayCard } from "@/lib/api";
import { loadProfile, OnboardingProfile } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

const FREE_FLIP_LIMIT = 5;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

function normalizeHref(value: string): string {
  return value.startsWith("http") ? value : `https://${value}`;
}

/* ---- Phase state machine ----
   idle     → fan deck visible, nothing selected
   hook     → a card emerged, showing hook text (back face)
   detail   → card collapsed left, detail panel slides in from right
*/
type Phase = "idle" | "hook" | "detail";

export function TodayFeed() {
  const [cards, setCards] = useState<TodayCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<OnboardingProfile | null>(null);
  const [personalizedHooks, setPersonalizedHooks] = useState<Record<string, PersonalizedHook>>({});
  const [loadingHookId, setLoadingHookId] = useState<string | null>(null);
  const [hookError, setHookError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [openedIds, setOpenedIds] = useState<string[]>([]);

  /* key bumps force React to remount the emerged‑card so the CSS entrance
     animation replays when switching between cards */
  const [emergeKey, setEmergeKey] = useState(0);
  const exitTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const router = useRouter();

  /* ---- data loading ---- */
  useEffect(() => {
    let live = true;
    async function load() {
      const storedProfile = loadProfile();
      if (!storedProfile) { router.push("/onboarding"); return; }
      setProfile(storedProfile);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { router.push("/auth"); return; }
      if (!live) return;

      setAccessToken(session.access_token);
      setEmail(session.user.email ?? null);
      try {
        const data = await fetchTodayCards(session.access_token);
        if (live) setCards(data);
      } catch (e) {
        if (live) setError(e instanceof Error ? e.message : "加载失败");
      } finally {
        if (live) setIsLoading(false);
      }
    }
    void load();
    return () => { live = false; };
  }, [router]);

  useEffect(() => () => { if (exitTimer.current) clearTimeout(exitTimer.current); }, []);

  /* ---- derived ---- */
  const selected = cards.find((c) => c.paper_id === selectedId) ?? null;
  const selectedPersonalizedHook = selected ? personalizedHooks[selected.paper_id] : null;
  const flipLimit = Math.min(FREE_FLIP_LIMIT, cards.length);
  const alreadyOpened = selected ? openedIds.includes(selected.paper_id) : false;
  const canFlip = !!selected && !!selectedPersonalizedHook && !alreadyOpened && openedIds.length < flipLimit;

  const progressText = useMemo(
    () => `今日可翻 ${flipLimit} 张 · 已翻 ${openedIds.length}/${flipLimit}`,
    [flipLimit, openedIds.length],
  );

  /* ---- actions ---- */
  const selectCard = useCallback((id: string) => {
    if (id === selectedId && phase === "hook") return;        // already showing
    setSelectedId(id);
    setPhase("hook");
    setHookError(null);
    setEmergeKey((k) => k + 1);                               // remount for animation
  }, [selectedId, phase]);

  const flipCard = useCallback(() => {
    if (!selected || !canFlip) return;
    setOpenedIds((cur) => [...cur, selected.paper_id]);
    setPhase("detail");
  }, [selected, canFlip]);

  const deselect = useCallback(() => {
    setPhase("idle");
    /* delay clearing selectedId so the exit animation can play */
    if (exitTimer.current) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => setSelectedId(null), 480);
  }, []);

  useEffect(() => {
    async function loadHook() {
      if (!selected || !profile || !accessToken) return;
      if (personalizedHooks[selected.paper_id]) return;

      setLoadingHookId(selected.paper_id);
      setHookError(null);
      try {
        const hook = await fetchPersonalizedHook(accessToken, selected.paper_id, profile);
        setPersonalizedHooks((current) => ({ ...current, [selected.paper_id]: hook }));
      } catch (e) {
        setHookError(e instanceof Error ? e.message : "专属 Hook 生成失败");
      } finally {
        setLoadingHookId((current) => (current === selected.paper_id ? null : current));
      }
    }

    void loadHook();
  }, [accessToken, personalizedHooks, profile, selected]);

  /* ---- render: loading / error ---- */
  if (isLoading) {
    return (
      <section className="stack">
        <div className="panel tarot-hero">
          <p className="eyebrow">今日牌阵</p>
          <h2>正在整理你的今日卡牌...</h2>
          <div className="skeleton hero-skeleton" />
        </div>
      </section>
    );
  }
  if (error) {
    return (
      <section className="panel">
        <h2>卡片加载失败</h2>
        <p className="muted">{error}</p>
      </section>
    );
  }

  /* ---- render: main ---- */
  const isDetail = phase === "detail";
  const hasSelection = phase !== "idle" && !!selected;

  return (
    <section className={`today-scene${isDetail ? " phase-detail" : ""}`}>
      {/* top‑bar metadata */}
      <div className="scene-meta scene-progress"><p>{progressText}</p></div>
      <div className="scene-meta scene-account"><p>{email ?? "已登录"}</p></div>

      <header className="scene-title">
        <p className="eyebrow">KnowTok Deck</p>
        <h2>选一张牌，先读 Hook，再决定要不要翻开</h2>
      </header>

      {/* ---- stage ---- */}
      <div className="today-stage">
        <div className="deck-theater">

          {/* --- fan deck: cards never change position --- */}
          <div className={`fan-deck center-stage${hasSelection ? " has-selection" : ""}`}>
            {cards.map((card, index) => {
              const offset = index - (cards.length - 1) / 2;
              const isSel = card.paper_id === selectedId;
              const isOpened = openedIds.includes(card.paper_id);

              return (
                <button
                  key={card.paper_id}
                  className={[
                    "fan-card",
                    isSel && hasSelection ? "fan-card--ghost" : "",
                    !isSel && hasSelection ? "fan-card--dim" : "",
                    isOpened ? "fan-card--spent" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => selectCard(card.paper_id)}
                  style={{
                    "--offset": String(offset),
                    "--rotation": `${offset * 6.5}deg`,
                  } as CSSProperties}
                  type="button"
                >
                  <span className="fan-card-inner">
                    <span className="fan-card-face">
                      <span className="constellation" />
                      <span className="fan-card-label">{card.source.toUpperCase()}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* --- emerged card (hook view) --- */}
          {selected && phase !== "idle" ? (
            <div
              key={emergeKey}
              className={`emerged ${phase === "detail" ? "emerged--left" : "emerged--center"}`}
            >
              <div className="emerged-card">
                <div className="emerged-card-inner">
                  {/* front = constellation (deck face) */}
                  <div className="emerged-face emerged-face--front">
                    <span className="constellation" />
                    <p className="emerged-source">{selected.source.toUpperCase()}</p>
                  </div>
                  {/* back = hook text (what user reads) */}
                  <div className="emerged-face emerged-face--back">
                    <p className="eyebrow">Hook</p>
                    <h3 className="emerged-hook">
                      {selectedPersonalizedHook?.hook_text
                        ?? (loadingHookId === selected.paper_id ? "正在为你生成专属 Hook..." : "还没生成出专属 Hook")}
                    </h3>
                    <p className="hook-caption">
                      {hookError
                        ? hookError
                        : loadingHookId === selected.paper_id
                          ? "会结合你的画像和这篇论文的信息，只生成一次并缓存。"
                          : "先读这一句，再决定要不要翻开它。"}
                    </p>
                  </div>
                </div>
              </div>

              {/* action buttons below card (only in hook phase) */}
              {phase === "hook" ? (
                <div className="hook-strip">
                  <p className="mini-caption">
                    {selected.source.toUpperCase()} · {formatDate(selected.published_at)}
                  </p>
                  <div className="hook-buttons">
                    <button className="secondary-button" onClick={deselect} type="button">
                      放回牌阵
                    </button>
                    <button
                      className="primary-button"
                      disabled={!canFlip}
                      onClick={flipCard}
                      type="button"
                    >
                      {loadingHookId === selected.paper_id
                        ? "正在生成专属 Hook..."
                        : openedIds.length >= flipLimit
                          ? "今日免费翻牌次数已用完"
                          : "翻开这张牌"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* --- detail panel (right side, slides in) --- */}
        <aside className={`detail-panel${isDetail ? " detail-panel--open" : ""}`}>
          {selected ? (
            <>
              <button className="detail-close" onClick={deselect} type="button" aria-label="关闭">✕</button>

              <div className="detail-head">
                <p className="eyebrow">Paper Detail</p>
                <h3>{selected.title}</h3>
              </div>

              <div className="preview-meta compact-meta detail-badges">
                <span className="badge">{selected.source.toUpperCase()}</span>
                <span className="badge ghost">{selected.impact_level}</span>
                <span className="badge ghost">{selected.time_scale}</span>
                <span className="badge ghost">可信度 {Math.round(selected.confidence * 100)}%</span>
              </div>

              <section className="detail-section hero-detail-block">
                <p className="info-label">一句话摘要</p>
                <p className="detail-summary">{selected.plain_summary}</p>
              </section>

              <section className="detail-section">
                <p className="info-label">Hook</p>
                <p className="detail-hook">{selectedPersonalizedHook?.hook_text ?? selected.hook_text}</p>
              </section>

              <section className="detail-section">
                <p className="info-label">为什么会推给你</p>
                <div className="detail-facts">
                  <div className="fact-pill"><span>来源</span><strong>{selected.source.toUpperCase()}</strong></div>
                  <div className="fact-pill"><span>发布日期</span><strong>{formatDate(selected.published_at)}</strong></div>
                  {selected.primary_category ? (
                    <div className="fact-pill"><span>主分类</span><strong>{selected.primary_category}</strong></div>
                  ) : null}
                  <div className="fact-pill"><span>影响层级</span><strong>{selected.impact_level}</strong></div>
                  <div className="fact-pill"><span>时间尺度</span><strong>{selected.time_scale}</strong></div>
                </div>
              </section>

              {selected.subjects.length > 0 ? (
                <section className="detail-section">
                  <p className="info-label">主题标签</p>
                  <div className="preview-meta compact-meta detail-badges">
                    {selected.subjects.map((subject) => (
                      <span key={subject} className="badge ghost">{subject}</span>
                    ))}
                  </div>
                </section>
              ) : null}

              {selected.authors.length > 0 ? (
                <section className="detail-section">
                  <p className="info-label">作者</p>
                  <p className="detail-summary">{selected.authors.join(" · ")}</p>
                </section>
              ) : null}

              {selected.comment ? (
                <section className="detail-section">
                  <p className="info-label">作者备注</p>
                  <p className="detail-summary">{selected.comment}</p>
                </section>
              ) : null}

              {selected.abstract ? (
                <section className="detail-section">
                  <p className="info-label">论文摘要</p>
                  <p className="detail-summary">{selected.abstract}</p>
                </section>
              ) : null}

              {selected.submission_history || selected.journal_ref ? (
                <section className="detail-section">
                  <p className="info-label">发表信息</p>
                  <div className="detail-facts">
                    {selected.journal_ref ? (
                      <div className="fact-pill wide"><span>Journal Ref</span><strong>{selected.journal_ref}</strong></div>
                    ) : null}
                    {selected.submission_history ? (
                      <div className="fact-pill wide"><span>提交记录</span><strong>{selected.submission_history}</strong></div>
                    ) : null}
                  </div>
                </section>
              ) : null}

              {selected.links.length > 0 ? (
                <section className="detail-section">
                  <p className="info-label">原文链接</p>
                  <div className="detail-link-grid">
                    {selected.links.map((link) => (
                      <a
                        key={`${link.label}-${link.url}`}
                        className="secondary-button detail-link"
                        href={normalizeHref(link.url)}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="detail-section">
                <p className="info-label">证据片段</p>
                <ul className="detail-sources">
                  {selected.source_refs.map((ref) => (
                    <li key={`${ref.section}-${ref.rank}`}>
                      <span className="source-rank">0{ref.rank}</span>
                      <div>
                        <p className="source-section">{ref.section}</p>
                        <p className="source-text">{ref.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
