export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="card-surface flex min-h-[260px] items-center justify-center px-6 py-10 text-slate-300">
      <p className="animate-pulse text-sm">{label}</p>
    </div>
  );
}
