export function ImpactPanel({
  text,
  updatedAt,
}: {
  text: string;
  updatedAt: string | null;
}) {
  return (
    <section className="card-surface p-5 md:p-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">Your relevance insight</p>
      <p className="mt-3 text-base leading-relaxed text-label-secondary">{text}</p>
      {updatedAt ? <p className="mt-4 text-xs text-label-tertiary">Updated: {new Date(updatedAt).toLocaleString()}</p> : null}
    </section>
  );
}
