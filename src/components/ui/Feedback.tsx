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
    <div className="mb-6 flex flex-col gap-4 border-b border-stroke pb-5 dark:border-white/10 sm:mb-7 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words text-2xl font-bold tracking-tight text-black dark:text-white sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-3xl break-words text-sm leading-relaxed text-body dark:text-body-dark">
            {description}
          </p>
        )}
        {children}
      </div>
      {actions && (
        <div className="flex w-full shrink-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      )}
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
    <div className="card-root min-w-0 border border-stroke p-4 dark:border-white/10 sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="break-words text-[11px] font-semibold uppercase tracking-wide text-body dark:text-body-dark sm:text-xs">
            {label}
          </p>
          <p className="mt-2 break-words text-xl font-bold text-black dark:text-white sm:text-2xl">
            {value}
          </p>
          {hint && <p className="mt-1 break-words text-xs text-body dark:text-body-dark">{hint}</p>}
        </div>
        {icon && (
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center sm:h-10 sm:w-10',
              toneClasses[tone],
            )}
          >
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
