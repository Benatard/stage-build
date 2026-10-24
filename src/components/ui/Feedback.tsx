import type { ReactNode } from 'react';
import { FiAlertCircle, FiInbox, FiLoader } from 'react-icons/fi';
import { cn } from '@/utils/format';
import { Button } from './Button';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-stroke pb-6 dark:border-white/10 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-body dark:text-body-dark">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'purple';
}) {
  const toneClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    danger: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
    purple: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  };

  return (
    <div className="card-root border border-stroke p-5 dark:border-white/10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-black dark:text-white">{value}</p>
          {hint && <p className="mt-1 text-xs text-body dark:text-body-dark">{hint}</p>}
        </div>
        {icon && (
          <span className={cn('flex h-10 w-10 items-center justify-center', toneClasses[tone])}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}

export function EmptyState({
  title = 'Aucune donnée',
  description = 'Aucun enregistrement ne correspond aux critères sélectionnés.',
  action,
  icon,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center bg-primary/10 text-primary">
        {icon ?? <FiInbox className="h-6 w-6" />}
      </span>
      <h3 className="text-base font-semibold text-black dark:text-white">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-body dark:text-body-dark">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Chargement des données…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 px-6 py-20 text-sm text-body dark:text-body-dark">
      <FiLoader className="h-5 w-5 animate-spin text-primary" />
      {label}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        <FiAlertCircle className="h-6 w-6" />
      </span>
      <h3 className="text-base font-semibold text-black dark:text-white">Erreur de chargement</h3>
      <p className="mt-1 max-w-md text-sm text-body dark:text-body-dark">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          Réessayer
        </Button>
      )}
    </div>
  );
}
