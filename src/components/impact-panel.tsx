export function ImpactPanel({
  text,
  updatedAt,
}: {
  text: string;
  updatedAt: string | null;
}) {
  return (
    <section className="card-surface p-5 md:p-6">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Your relevance insight</p>
      <p className="mt-3 text-base leading-relaxed text-slate-100">{text}</p>
      {updatedAt ? <p className="mt-4 text-xs text-slate-400">Updated: {new Date(updatedAt).toLocaleString()}</p> : null}
    </section>
  );
}
