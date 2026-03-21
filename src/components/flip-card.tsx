"use client";

import { useState } from "react";
import Link from "next/link";
import { authFetch } from "@/lib/api-client";
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

export function FlipCard({ paper, onSave, onSkip, onImpact, impactLoading }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [detail, setDetail] = useState<PaperBackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
        // silently fail — user can still see front
      } finally {
        setDetailLoading(false);
      }
    }
  };

  return (
    <div className="perspective-container">
      <div className={`card-flip-inner ${flipped ? "flipped" : ""}`}>
        {/* Front face */}
        <div className="card-face">
          <article
            className="card-surface min-h-[420px] cursor-pointer p-6 md:p-8"
            onClick={handleFlip}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-pill bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
                {paper.primaryCategory || "General"}
              </span>
            </div>

            <h2 className="text-2xl font-semibold leading-tight text-label-primary md:text-3xl">
              {paper.title}
            </h2>

            <p className="mt-4 text-base leading-relaxed text-label-secondary md:text-lg">
              {paper.hookSummaryEn}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {paper.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="rounded-pill border border-separator px-3 py-1 text-xs text-label-tertiary"
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="mt-8 text-center text-xs font-medium text-label-tertiary">
              Tap to reveal details
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
              <h2 className="text-lg font-semibold leading-tight text-label-primary">
                {paper.title}
              </h2>

              {detailLoading ? (
                <div className="mt-4 flex items-center gap-2 text-sm text-label-tertiary">
                  <span className="spinner" />
                  Loading details...
                </div>
              ) : detail ? (
                <div className="mt-4 max-h-[200px] overflow-y-auto">
                  <p className="text-sm leading-relaxed text-label-secondary">
                    {detail.abstract}
                  </p>
                  <p className="mt-3 text-xs text-label-tertiary">
                    {detail.authors.join(", ")}
                  </p>
                </div>
              ) : null}

              <p className="mt-3 text-xs text-label-tertiary">
                Published {new Date(paper.publishedAt).toLocaleDateString()}
              </p>

              <Link
                href={paper.absUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-accent"
                onClick={(e) => e.stopPropagation()}
              >
                View on arXiv
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                className="primary-button flex-1"
                type="button"
                onClick={() => onSave()}
              >
                {paper.saved ? "Saved" : "Save"}
              </button>

              <button
                className="pill-button flex-1"
                type="button"
                onClick={() => onSkip()}
              >
                Skip
              </button>

              <button
                className="primary-button w-full"
                type="button"
                disabled={impactLoading}
                onClick={() => onImpact(false)}
              >
                {impactLoading ? "Thinking..." : "What does this mean for me?"}
              </button>
            </div>

            <p className="mt-4 text-center text-xs font-medium text-label-tertiary">
              Tap card to flip back
            </p>
          </article>
        </div>
      </div>
    </div>
  );
}
