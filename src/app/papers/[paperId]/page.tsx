"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ImpactPanel } from "@/components/impact-panel";
import { LoadingState } from "@/components/loading-state";
import { RequireAuth } from "@/components/require-auth";
import { authFetch } from "@/lib/api-client";
import type { PaperDetail } from "@/types/domain";

function PaperDetailContent() {
  const params = useParams<{ paperId: string }>();
  const paperId = params.paperId;

  const [paper, setPaper] = useState<PaperDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<{ text: string; updatedAt: string | null } | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await authFetch(`/api/papers/${paperId}`, {
          method: "GET",
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load paper");
        }

        if (active) {
          setPaper(payload.paper as PaperDetail);
        }
      } catch (loadError) {
        if (active) {
          setError((loadError as Error).message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [paperId]);

  const getImpact = async (refresh = false) => {
    setImpactLoading(true);

    try {
      const response = await authFetch(`/api/papers/${paperId}/impact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to generate insight");
      }

      setImpact({
        text: payload.text as string,
        updatedAt: (payload.updatedAt as string | null) ?? null,
      });
    } catch (impactError) {
      setError((impactError as Error).message);
    } finally {
      setImpactLoading(false);
    }
  };

  if (loading) {
    return <LoadingState label="Loading paper details..." />;
  }

  if (!paper) {
    return <p className="text-sm text-danger">{error || "Paper not found."}</p>;
  }

  return (
    <section className="grid gap-4">
      <article className="card-surface p-6 md:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-accent">{paper.primaryCategory}</p>
        <h2 className="mt-2 text-3xl font-bold text-label-primary">{paper.title}</h2>

        <div className="mt-4 flex flex-wrap gap-2">
          {paper.tags.map((tag) => (
            <span className="rounded-pill border border-separator px-3 py-1 text-xs text-label-tertiary" key={tag}>
              {tag}
            </span>
          ))}
        </div>

        <p className="mt-6 text-sm leading-relaxed text-label-secondary">{paper.abstract}</p>

        <div className="mt-6 grid gap-2 text-sm text-label-secondary">
          <p>
            <strong className="text-label-primary">Authors:</strong> {paper.authors.join(", ")}
          </p>
          <p>
            <strong className="text-label-primary">Published:</strong> {new Date(paper.publishedAt).toLocaleString()}
          </p>
          <p>
            <strong className="text-label-primary">arXiv:</strong> {paper.arxivIdBase}v{paper.arxivIdVersion}
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="primary-button"
            type="button"
            disabled={impactLoading}
            onClick={() => void getImpact(false)}
          >
            {impactLoading ? "Thinking..." : "What does this mean for me?"}
          </button>
          <button className="pill-button" type="button" onClick={() => void getImpact(true)}>
            Refresh insight
          </button>
          <Link className="pill-button" href={paper.absUrl} target="_blank" rel="noreferrer">
            Open arXiv abstract
          </Link>
          {paper.pdfUrl ? (
            <Link className="pill-button" href={paper.pdfUrl} target="_blank" rel="noreferrer">
              Open PDF
            </Link>
          ) : null}
        </div>
      </article>

      {impact ? <ImpactPanel text={impact.text} updatedAt={impact.updatedAt} /> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}

export default function PaperDetailPage() {
  return (
    <RequireAuth fallbackLabel="Checking account...">
      {() => (
        <AppShell>
          <PaperDetailContent />
        </AppShell>
      )}
    </RequireAuth>
  );
}
