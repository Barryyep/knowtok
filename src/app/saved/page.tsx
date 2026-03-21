"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ImpactPanel } from "@/components/impact-panel";
import { LoadingState } from "@/components/loading-state";
import { RequireAuth } from "@/components/require-auth";
import { authFetch } from "@/lib/api-client";
import type { PaperCard } from "@/types/domain";

function SavedContent() {
  const [items, setItems] = useState<PaperCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [impactByPaperId, setImpactByPaperId] = useState<Record<string, { text: string; updatedAt: string | null }>>({});
  const [impactLoadingFor, setImpactLoadingFor] = useState<string | null>(null);

  const loadSaved = async () => {
    const response = await authFetch("/api/saved", {
      method: "GET",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Failed to load saved papers");
    }

    setItems(payload.items as PaperCard[]);
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        await loadSaved();
      } catch (savedError) {
        if (active) setError((savedError as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
  }, []);

  const toggleSave = async (paperId: string, saved: boolean) => {
    const response = await authFetch(`/api/papers/${paperId}/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ saved }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to update save status");
    }

    if (!saved) {
      setItems((previous) => previous.filter((item) => item.id !== paperId));
    }
  };

  const getImpact = async (paperId: string, refresh = false) => {
    setImpactLoadingFor(paperId);
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

      setImpactByPaperId((previous) => ({
        ...previous,
        [paperId]: {
          text: payload.text as string,
          updatedAt: (payload.updatedAt as string | null) ?? null,
        },
      }));
    } finally {
      setImpactLoadingFor(null);
    }
  };

  if (loading) {
    return <LoadingState label="Loading saved papers..." />;
  }

  return (
    <section className="grid gap-4">
      <header>
        <h2 className="text-2xl font-semibold text-label-primary">Saved papers</h2>
        <p className="mt-2 text-sm text-label-secondary">Revisit papers and regenerate relevance insights at any time.</p>
      </header>

      {items.length === 0 ? (
        <div className="card-surface p-6 text-label-secondary">No saved papers yet.</div>
      ) : null}

      {items.map((paper) => (
        <article className="card-surface p-6" key={paper.id}>
          <p className="text-xs font-medium uppercase tracking-widest text-accent">{paper.primaryCategory}</p>
          <h3 className="mt-2 text-xl font-semibold text-label-primary">{paper.title}</h3>
          <p className="mt-2 text-sm text-label-secondary">{paper.hookSummaryEn}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            {paper.tags.map((tag) => (
              <span className="rounded-pill border border-separator px-3 py-1 text-xs text-label-tertiary" key={tag}>
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className="pill-button" type="button" onClick={() => void toggleSave(paper.id, false)}>
              Remove from saved
            </button>
            <button
              className="primary-button"
              type="button"
              disabled={impactLoadingFor === paper.id}
              onClick={() => void getImpact(paper.id, false)}
            >
              {impactLoadingFor === paper.id ? "Thinking..." : "What does this mean for me?"}
            </button>
            <button className="pill-button" type="button" onClick={() => void getImpact(paper.id, true)}>
              Refresh insight
            </button>
            <Link className="pill-button" href={`/papers/${paper.id}`}>
              Open details
            </Link>
          </div>

          {impactByPaperId[paper.id] ? (
            <div className="mt-5">
              <ImpactPanel text={impactByPaperId[paper.id].text} updatedAt={impactByPaperId[paper.id].updatedAt} />
            </div>
          ) : null}
        </article>
      ))}

      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </section>
  );
}

export default function SavedPage() {
  return (
    <RequireAuth fallbackLabel="Checking account...">
      {() => (
        <AppShell>
          <SavedContent />
        </AppShell>
      )}
    </RequireAuth>
  );
}
