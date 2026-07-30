import { ReactNode } from "react";
import { Link } from "wouter";
import { ChevronRight } from "lucide-react";

export function Section({ title, actionHref, actionLabel, children }: { title: string; actionHref?: string; actionLabel?: string; children: ReactNode }) {
  return (
    <section className="px-5 py-6">
      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display text-2xl text-ink-950">{title}</h2>
        {actionHref && actionLabel && (
          <Link href={actionHref} className="text-sm font-bold text-lagoon-600 flex items-center gap-0.5 group">
            {actionLabel}
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
