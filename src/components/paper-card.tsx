import Link from "next/link";
import type { PaperCard } from "@/types/domain";

export function PaperCardView({
  paper,
  onSkip,
  onSaveToggle,
  onImpact,
  impactLoading,
  saveLoading,
}: {
  paper: PaperCard;
  onSkip: () => Promise<void>;
  onSaveToggle: () => Promise<void>;
  onImpact: (refresh?: boolean) => Promise<void>;
  impactLoading: boolean;
  saveLoading: boolean;
}) {
  return (
    <article className="card-surface p-6 md:p-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-cyan-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-200">
          {paper.primaryCategory || "General"}
        </span>
        {paper.tags.slice(0, 5).map((tag) => (
          <span key={tag} className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200">
            {tag}
          </span>
        ))}
      </div>

      <h2 className="font-display text-2xl font-semibold leading-tight text-white md:text-3xl">{paper.title}</h2>
      <p className="mt-4 text-base leading-relaxed text-slate-200 md:text-lg">{paper.hookSummaryEn}</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <button className="pill-button" type="button" onClick={onSkip}>
          Skip 30 days
        </button>

        <button className="pill-button" disabled={saveLoading} type="button" onClick={onSaveToggle}>
          {saveLoading ? "Saving..." : paper.saved ? "Unsave" : "Save"}
        </button>

        <button className="primary-button" disabled={impactLoading} type="button" onClick={() => onImpact(false)}>
          {impactLoading ? "Thinking..." : "What does this mean for me?"}
        </button>

        <button className="pill-button" disabled={impactLoading} type="button" onClick={() => onImpact(true)}>
          Refresh insight
        </button>

        <Link className="pill-button" href={`/papers/${paper.id}`}>
          Open details
        </Link>
      </div>
    </article>
  );
}
