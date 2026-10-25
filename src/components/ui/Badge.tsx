import type { ReactNode } from 'react';
import { cn } from '@/utils/format';

type BadgeTone =
  | 'neutral'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  primary: 'bg-primary/10 text-primary dark:bg-primary/20',
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  purple: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const successValues = new Set([
  'actif', 'active', 'present', 'acquis', 'maitrise', 'validee', 'valide',
  'publiee', 'publie', 'termine', 'atteint', 'depasse', 'corrigee', 'corrige',
  'soumis', 'soumise', 'fait', 'reussi', 'admis', 'progression_normale',
  'confirmee',
]);

const warningValues = new Set([
  'en_cours', 'en_attente', 'retard', 'surveillance', 'a_renforcer',
  'plan_amelioration', 'en_correction', 'candidat', 'programmee', 'planifiee',
  'terminee', 'soumis', 'brouillon', 'evalue', 'a_faire', 'commentee',
]);

const dangerValues = new Set([
  'absent', 'absence_non_justifiee', 'inactive', 'blocked', 'non_atteint',
  'non_acquis', 'non_valide', 'entretien_obligatoire', 'annule', 'annulee',
  'non_commence', 'a_refaire', 'archive', 'archivee', 'cloturee',
]);

const infoValues = new Set([
  'absence_justifiee', 'sortie_autorisee', 'info', 'soumis', 'en_cours',
  'planifiee', 'publiee',
]);

export function statusTone(value?: string | null): BadgeTone {
  if (!value) return 'neutral';
  if (successValues.has(value)) return 'success';
  if (dangerValues.has(value)) return 'danger';
  if (warningValues.has(value)) return 'warning';
  if (infoValues.has(value)) return 'info';
  return 'neutral';
}
