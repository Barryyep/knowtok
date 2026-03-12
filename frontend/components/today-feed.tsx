"use client";

import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { fetchTodayCards, TodayCard } from "@/lib/api";
import { loadProfile } from "@/lib/storage";
import { supabase } from "@/lib/supabase";

const FREE_FLIP_LIMIT = 5;

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

export function TodayFeed() {
  const [cards, setCards] = useState<TodayCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [openedCardIds, setOpenedCardIds] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    async function loadCards() {
      const profile = loadProfile();
      if (!profile) {
        router.push("/onboarding");
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/auth");
        return;
      }

      if (!isMounted) {
        return;
      }

      setEmail(session.user.email ?? null);

      try {
        const nextCards = await fetchTodayCards(session.access_token);
        if (!isMounted) {
          return;
        }
        setCards(nextCards);
      } catch (nextError) {
        if (!isMounted) {
          return;
        }
        setError(nextError instanceof Error ? nextError.message : "加载失败");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCards();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const selectedCard = cards.find((card) => card.paper_id === selectedCardId) ?? null;
  const flipLimit = Math.min(FREE_FLIP_LIMIT, cards.length);
  const selectedCardOpened = selectedCard ? openedCardIds.includes(selectedCard.paper_id) : false;
  const canFlipSelected = Boolean(
    selectedCard && !selectedCardOpened && openedCardIds.length < flipLimit
  );

  const progressText = useMemo(
    () => `今日可翻 ${flipLimit} 张 · 已翻 ${openedCardIds.length}/${flipLimit}`,
    [flipLimit, openedCardIds.length]
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/auth");
  }

  function handleFlip() {
    if (!selectedCard || !canFlipSelected) {
      return;
    }

    setOpenedCardIds((current) => [...current, selectedCard.paper_id]);
  }

  function handleDeselect() {
    setSelectedCardId(null);
  }

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

  return (
    <section className={selectedCardOpened ? "today-scene detail-open" : "today-scene"}>
      <div className="scene-meta scene-progress">
        <p>{progressText}</p>
      </div>
      <div className="scene-meta scene-account">
        <p>{email ?? "已登录"}</p>
      </div>
      <div className="scene-meta scene-actions">
        <button className="secondary-button subtle" onClick={handleLogout} type="button">
          退出
        </button>
      </div>

      <header className="scene-title">
        <p className="eyebrow">KnowTok Deck</p>
        <h2>选一张牌，先读 Hook，再决定要不要翻开</h2>
      </header>

      <div className="today-stage">
        <div className="deck-theater">
          <div className={selectedCard ? "fan-deck center-stage has-selection" : "fan-deck center-stage"}>
            {cards.map((card, index) => {
              const isSelected = card.paper_id === selectedCardId;
              const isOpened = openedCardIds.includes(card.paper_id);
              const offset = index - (cards.length - 1) / 2;
              const shiftedOffset = selectedCardId
                ? (() => {
                    if (offset === 0) {
                      return 0;
                    }

                    const distance = Math.abs(offset);
                    const push =
                      distance <= 1
                        ? 3.1
                        : distance <= 2
                          ? 2.2
                          : 1.4;

                    return offset < 0 ? offset - push : offset + push;
                  })()
                : offset;

              return (
                <button
                  key={card.paper_id}
                  className={[
                    "fan-card",
                    "selected-deck-card",
                    isSelected ? "selected ghosted" : "",
                    isOpened ? "opened" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => setSelectedCardId(card.paper_id)}
                  style={
                    {
                      "--offset": String(offset),
                      "--shifted-offset": String(shiftedOffset),
                      "--rotation": `${offset * 6.5}deg`,
                    } as CSSProperties
                  }
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

          {selectedCard ? (
            <div className={selectedCardOpened ? "emerged-card-layer docked" : "emerged-card-layer previewing"}>
              <div className={selectedCardOpened ? "emerged-card is-opened" : "emerged-card is-preview"}>
                <div className="emerged-card-inner">
                  <div className="emerged-card-face emerged-card-front">
                    <span className="constellation" />
                    <p className="emerged-card-source">{selectedCard.source.toUpperCase()}</p>
                    <h3>{selectedCard.title}</h3>
                    <div className="preview-meta compact-meta">
                      <span className="badge ghost">{formatDate(selectedCard.published_at)}</span>
                      <span className="badge ghost">可信度 {Math.round(selectedCard.confidence * 100)}%</span>
                    </div>
                  </div>

                  <div className="emerged-card-face emerged-card-back">
                    <p className="eyebrow">Hook</p>
                    <h3>{selectedCard.hook_text}</h3>
                    <p className="hook-caption">先读这一句，再决定要不要翻开它。</p>
                  </div>
                </div>
              </div>

              <div className={selectedCardOpened ? "hook-action-strip hidden" : "hook-action-strip"}>
                <p className="mini-caption">
                  {selectedCard.source.toUpperCase()} · {formatDate(selectedCard.published_at)}
                </p>
                <div className="hook-buttons">
                  <button className="secondary-button" onClick={handleDeselect} type="button">
                    放回牌阵
                  </button>
                  <button
                    className="primary-button"
                    disabled={!canFlipSelected}
                    onClick={handleFlip}
                    type="button"
                  >
                    {selectedCardOpened
                      ? "已翻开"
                      : openedCardIds.length >= flipLimit
                        ? "今日免费翻牌次数已用完"
                        : "翻开这张牌"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <aside className={selectedCardOpened ? "detail-panel visible" : "detail-panel"}>
          {selectedCard ? (
            <>
              <div className="detail-head">
                <p className="eyebrow">Paper Detail</p>
                <h3>{selectedCard.title}</h3>
              </div>

              <div className="preview-meta compact-meta detail-badges">
                <span className="badge">{selectedCard.source.toUpperCase()}</span>
                <span className="badge ghost">{selectedCard.impact_level}</span>
                <span className="badge ghost">{selectedCard.time_scale}</span>
                <span className="badge ghost">可信度 {Math.round(selectedCard.confidence * 100)}%</span>
              </div>

              <section className="detail-section hero-detail-block">
                <p className="info-label">一句话摘要</p>
                <p className="detail-summary">{selectedCard.plain_summary}</p>
              </section>

              <section className="detail-section">
                <p className="info-label">为什么会推给你</p>
                <div className="detail-facts">
                  <div className="fact-pill">
                    <span>来源</span>
                    <strong>{selectedCard.source.toUpperCase()}</strong>
                  </div>
                  <div className="fact-pill">
                    <span>发布日期</span>
                    <strong>{formatDate(selectedCard.published_at)}</strong>
                  </div>
                  <div className="fact-pill">
                    <span>影响层级</span>
                    <strong>{selectedCard.impact_level}</strong>
                  </div>
                  <div className="fact-pill">
                    <span>时间尺度</span>
                    <strong>{selectedCard.time_scale}</strong>
                  </div>
                </div>
              </section>

              <section className="detail-section">
                <p className="info-label">证据片段</p>
                <ul className="detail-sources">
                  {selectedCard.source_refs.map((ref) => (
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
