export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="card-surface flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 py-10">
      <span className="spinner" />
      <p className="text-sm text-label-tertiary">{label}</p>
    </div>
  );
}
