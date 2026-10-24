export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function round(value: number, decimals = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function average(values: Array<number | null | undefined>): number {
  const valid = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  if (valid.length === 0) return 0;
  return round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

export function percentage(value: number, maximum: number): number {
  if (maximum <= 0) return 0;
  return round((value / maximum) * 100);
}

export function formatDate(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatLongDate(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTime(value?: string | null, fallback = '—'): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 5);
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fullName(person?: {
  first_name?: string | null;
  last_name?: string | null;
  prenom?: string | null;
  nom?: string | null;
  postnom?: string | null;
} | null): string {
  if (!person) return '—';

  if (person.prenom || person.nom) {
    return [person.prenom, person.nom, person.postnom].filter(Boolean).join(' ');
  }

  return [person.first_name, person.last_name].filter(Boolean).join(' ') || '—';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function truncate(value: string, length = 90): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}…`;
}

export function getErrorMessage(error: unknown, fallback = 'Une erreur est survenue.'): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export function sortByDate<T>(
  rows: T[],
  readDate: (row: T) => string | null | undefined,
  direction: 'asc' | 'desc' = 'desc',
): T[] {
  return [...rows].sort((a, b) => {
    const left = readDate(a) ? new Date(readDate(a) as string).getTime() : 0;
    const right = readDate(b) ? new Date(readDate(b) as string).getTime() : 0;
    return direction === 'asc' ? left - right : right - left;
  });
}
