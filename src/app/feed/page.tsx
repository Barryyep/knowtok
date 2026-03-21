"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { ImpactPanel } from "@/components/impact-panel";
import { LoadingState } from "@/components/loading-state";
import { SwipeDeck } from "@/components/swipe-deck";
import { RequireAuth } from "@/components/require-auth";
import { authFetch } from "@/lib/api-client";
import { uniqueById } from "@/lib/feed-mix";
import { CATEGORY_OPTIONS } from "@/lib/constants";
import type { HumanCategory, PaperCard } from "@/types/domain";

function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bootLoading, setBootLoading] = useState(true);
  const [personalizing, setPersonalizing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState<HumanCategory | "">("");
  const [items, setItems] = useState<PaperCard[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [impact, setImpact] = useState<{ text: string; updatedAt: string | null } | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);

  const activePaper = useMemo(() => items[activeIndex] ?? null, [items, activeIndex]);
  const activePaperId = activePaper?.id;

  const fetchFeed = async (reset: boolean) => {
    const params = new URLSearchParams();
    params.set("limit", "12");
    if (category) {
      params.set("category", category);
    }
    if (!reset && cursor) {
      params.set("cursor", cursor);
    }

    const response = await authFetch(`/api/feed?${params.toString()}`, {
      method: "GET",
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Failed to load feed");
    }

    const nextItems = payload.items as PaperCard[];
    setCursor(payload.nextCursor ?? null);

    if (reset) {
      setItems(nextItems);
      setActiveIndex(0);
      setImpact(null);
    } else {
      setItems((previous) => uniqueById([...previous, ...nextItems]));
    }
  };

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const profileResponse = await authFetch("/api/profile", { method: "GET" });
        const profilePayload = await profileResponse.json();

        if (!profilePayload.onboardingComplete) {
          router.replace("/onboarding");
          return;
        }

        // Show personalizing state for first-time users (arriving from onboarding)
        const fromOnboarding = searchParams.get("from") === "onboarding";
        if (fromOnboarding && active) {
          setPersonalizing(true);
          // Brief delay to show the personalizing message
          await new Promise((resolve) => setTimeout(resolve, 2000));
          if (active) setPersonalizing(false);
        }

        await fetchFeed(true);
      } catch (bootError) {
        if (active) {
          setError((bootError as Error).message);
        }
      } finally {
        if (active) {
          setBootLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]);

  useEffect(() => {
    if (!activePaperId) return;

    void authFetch("/api/events", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paperId: activePaperId,
        eventType: "view",
        metadata: {
          source: "feed_page",
        },
      }),
    }).catch(() => undefined);
  }, [activePaperId]);

  useEffect(() => {
    if (bootLoading || loadingMore) return;
    if (items.length === 0) return;
    if (!cursor) return;
    if (activeIndex < Math.max(items.length - 3, 0)) return;

    setLoadingMore(true);
    fetchFeed(false)
      .catch((loadError) => setError((loadError as Error).message))
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, items.length, cursor, bootLoading, loadingMore]);

  useEffect(() => {
    if (bootLoading) return;

    setLoadingMore(true);
    fetchFeed(true)
      .catch((loadError) => setError((loadError as Error).message))
      .finally(() => setLoadingMore(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const goNext = () => {
    setActiveIndex((previous) => Math.min(previous + 1, Math.max(items.length - 1, 0)));
    setImpact(null);
  };

  const handleSkip = async () => {
    if (!activePaper) return;

    await authFetch(`/api/papers/${activePaper.id}/skip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    goNext();
  };

  const handleSave = async () => {
    if (!activePaper) return;

    try {
      const response = await authFetch(`/api/papers/${activePaper.id}/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ saved: true }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Save action failed");
      }

      setItems((previous) =>
        previous.map((item) => (item.id === activePaper.id ? { ...item, saved: true } : item)),
      );
    } catch {
      // silent
    }

    goNext();
  };

  const handleImpact = async (refresh = false) => {
    if (!activePaper) return;

    setImpactLoading(true);
    setError(null);

    try {
      const response = await authFetch(`/api/papers/${activePaper.id}/impact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Impact generation failed");
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

  if (bootLoading || personalizing) {
    return (
      <LoadingState
        label={personalizing ? "Personalizing your feed..." : "Loading your feed..."}
      />
    );
  }

  if (!activePaper) {
    return (
      <section className="card-surface p-8">
        {category ? (
          <>
            <h2 className="text-xl font-semibold text-label-primary">
              No {category} papers today
            </h2>
            <p className="mt-2 text-sm text-label-secondary">
              Here&apos;s what&apos;s trending in For You!
            </p>
            <button
              className="primary-button mt-4 min-h-[44px]"
              type="button"
              onClick={() => setCategory("")}
            >
              Switch to For You
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-label-primary">No papers available</h2>
            <p className="mt-2 text-sm text-label-secondary">
              Check back later for fresh discoveries.
            </p>
          </>
        )}
      </section>
    );
  }

  return (
    <>
      {/* Category filter pills */}
      <section className="mb-4 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <button
          className={`pill-button min-h-[44px] shrink-0 ${category === "" ? "bg-accent text-white border-accent" : ""}`}
          type="button"
          onClick={() => setCategory("")}
        >
          For You
        </button>
        {CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.key}
            className={`pill-button min-h-[44px] shrink-0 ${category === option.key ? "bg-accent text-white border-accent" : ""}`}
            type="button"
            onClick={() => setCategory(option.key)}
          >
            {option.label}
          </button>
        ))}
      </section>

      {/* Card counter */}
      <p className="mb-3 text-center text-xs text-label-tertiary">
        {Math.min(activeIndex + 1, items.length)} of {items.length}
      </p>

      {/* Swipeable card */}
      <SwipeDeck
        paper={activePaper}
        cardKey={activePaper.id}
        onSwipeLeft={() => void handleSkip()}
        onSwipeRight={() => void handleSave()}
        onImpact={(refresh) => void handleImpact(refresh)}
        impactLoading={impactLoading}
      />

      {/* Impact panel */}
      <AnimatePresence>
        {impact ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3 }}
            className="mt-4"
          >
            <ImpactPanel text={impact.text} updatedAt={impact.updatedAt} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {loadingMore ? (
        <div className="mt-4">
          <LoadingState label="Loading more papers..." />
        </div>
      ) : null}
      {error ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
    </>
  );
}

export default function FeedPage() {
  return (
    <RequireAuth fallbackLabel="Checking account access...">
      {() => (
        <AppShell>
          <Suspense fallback={<LoadingState label="Loading your feed..." />}>
            <FeedContent />
          </Suspense>
        </AppShell>
      )}
    </RequireAuth>
  );
}
