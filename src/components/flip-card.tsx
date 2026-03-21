"use client";

import { useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api-client";
import { useLanguage } from "@/lib/language-context";
import type { PaperCard } from "@/types/domain";

interface FlipCardProps {
  paper: PaperCard;
  onSave: () => void;
  onSkip: () => void;
  onImpact: (refresh?: boolean) => void;
  impactLoading: boolean;
}

interface PaperBackDetail {
  abstract: string;
  authors: string[];
}

async function handleShare(paper: PaperCard) {
  const shareData = {
    title: paper.personalizedHook || paper.title,
    text: paper.plainSummary || paper.hookSummaryEn,
    url: paper.absUrl,
  };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch {
      // User cancelled or share failed, fall through to clipboard
    }
  }

  // Clipboard fallback
  try {
    await navigator.clipboard.writeText(`${shareData.title}\n\n${shareData.url}`);
  } catch {
    // silent
  }
}

export function FlipCard({ paper, onSave, onSkip, onImpact, impactLoading }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [detail, setDetail] = useState<PaperBackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { lang, t } = useLanguage();

  const handleFlip = async () => {
    const nextFlipped = !flipped;
    setFlipped(nextFlipped);

    if (nextFlipped && !detail) {
      setDetailLoading(true);
      try {
        const response = await authFetch(`/api/papers/${paper.id}`, { method: "GET" });
        const payload = await response.json();
        if (response.ok && payload.paper) {
          setDetail({
            abstract: payload.paper.abstract as string,
            authors: payload.paper.authors as string[],
          });
        }
      } catch {
        // silently fail
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const hook = lang === "zh"
    ? (paper.hookSummaryZh || paper.personalizedHook || paper.hookSummaryEn)
    : (paper.personalizedHook || paper.hookSummaryEn);
  const summary = lang === "zh"
    ? (paper.plainSummaryZh || paper.plainSummary || paper.hookSummaryEn)
    : (paper.plainSummary || paper.hookSummaryEn);
  const categoryLabel = paper.humanCategory || paper.primaryCategory || "General";

  return (
    <div className="perspective-container">
      <div className={`card-flip-inner ${flipped ? "flipped" : ""}`}>
        {/* Front face */}
        <div className="card-face">
          <article
            className="card-surface min-h-[420px] cursor-pointer p-6 md:p-8"
            onClick={handleFlip}
          >
            {/* Category badge */}
            <span className="mb-4 inline-block rounded-pill bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
              {categoryLabel}
            </span>

            {/* HERO: personalized hook */}
            <h2 className="text-xl font-bold leading-tight text-label-primary md:text-3xl">
              {hook}
            </h2>

            {/* Plain summary */}
            <p className="mt-4 text-base leading-relaxed text-label-secondary">
              {summary}
            </p>

            {/* De-emphasized paper title + metadata */}
            <div className="mt-6">
              <p className="text-xs text-label-tertiary">{paper.title}</p>
              <p className="mt-1 text-xs text-label-tertiary">
                {new Date(paper.publishedAt).toLocaleDateString()} &middot; arXiv
              </p>
            </div>

            <p className="mt-6 text-center text-xs font-medium text-label-tertiary">
              {t.tapToLearnMore}
            </p>
          </article>
        </div>

        {/* Back face */}
        <div className="card-face-back">
          <article className="card-surface min-h-[420px] p-6 md:p-8">
            <div
              className="cursor-pointer"
              onClick={handleFlip}
            >
              {/* Layer 1: personalized hook (repeated, smaller) */}
              <h3 className="text-base font-semibold leading-tight text-label-primary md:text-lg">
                {hook}
              </h3>

              {/* Layer 2: plain summary */}
              <p className="mt-3 text-sm leading-relaxed text-label-secondary">
                {summary}
              </p>

              {detailLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-label-tertiary">
                  <span className="spinner" />
                  Loading details...
                </div>
              ) : null}

              {/* Source footer */}
              <div className="mt-4 border-t border-separator pt-4">
                <p className="text-xs font-medium text-label-primary">{paper.title}</p>
                {detail ? (
                  <p className="mt-1 text-xs text-label-tertiary">
                    {detail.authors.join(", ")}
                  </p>
                ) : null}
                <Link
                  href={paper.absUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs text-accent"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.viewOnArxiv}
                </Link>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
              {/* Layer 3: Impact button */}
              <button
                className="primary-button min-h-[44px] w-full"
                type="button"
                disabled={impactLoading}
                onClick={() => onImpact(false)}
              >
                {impactLoading ? "Thinking..." : t.whatThisMeans}
              </button>

              <button
                className="primary-button min-h-[44px] flex-1"
                type="button"
                onClick={() => onSave()}
              >
                {paper.saved ? t.saved : t.save}
              </button>

              <button
                className="pill-button min-h-[44px] flex-1"
                type="button"
                onClick={() => onSkip()}
              >
                {t.skip}
              </button>

              <button
                className="pill-button min-h-[44px] w-full"
                type="button"
                onClick={() => void handleShare(paper)}
              >
                {t.share}
              </button>
            </div>

            <p className="mt-4 text-center text-xs font-medium text-label-tertiary">
              {t.tapToFlipBack}
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
