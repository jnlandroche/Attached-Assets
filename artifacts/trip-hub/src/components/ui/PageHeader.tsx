export function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div className="pt-12 pb-8 px-6 text-center space-y-3">
      {eyebrow && (
        <p className="text-xs font-bold tracking-[0.2em] text-brass-600 uppercase">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-4xl text-ink-950">{title}</h1>
      {subtitle && (
        <p className="text-sm font-medium text-ink-700/60 max-w-[280px] mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}
