import { optionLabel, type SelectOption } from '@/config/options';

export function buildOptions<T extends { id: string }>(
  rows: T[],
  label: (row: T) => string,
): SelectOption[] {
  return rows.map((row) => ({ value: row.id, label: label(row) }));
}

export { optionLabel };
