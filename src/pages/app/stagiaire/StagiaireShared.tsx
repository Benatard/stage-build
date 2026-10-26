import type { ReactNode } from 'react';
import { ErrorState, LoadingState } from '@/components/ui/Feedback';

export function SelfGate({
  loading,
  error,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
}) {
  if (loading) return <LoadingState label="Chargement de votre espace…" />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  return <>{children}</>;
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card-root min-w-0 border border-stroke dark:border-white/10 ${className ?? ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-5 py-4 dark:border-white/10">
        <div>
          <h2 className="text-sm font-bold text-black dark:text-white">{title}</h2>
          {description && (
            <p className="mt-0.5 text-xs text-body dark:text-body-dark">{description}</p>
          )}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export function DefinitionGrid({
  items,
  columns = 2,
}: {
  items: Array<[string, ReactNode]>;
  columns?: 2 | 3;
}) {
  return (
    <dl className={`grid gap-4 p-5 text-sm ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[11px] uppercase tracking-wide text-body dark:text-body-dark">
            {label}
          </dt>
          <dd className="mt-1 font-medium text-dark dark:text-white">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
