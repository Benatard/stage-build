export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function flattenForgeRow(value: unknown): unknown {
  const record = asRecord(value);
  if (!record) return value;

  const wrapper = asRecord(record.data);
  if (!wrapper) return value;

  const payload = asRecord(wrapper.data) ?? wrapper;

  return {
    ...payload,
    id: record.id ?? wrapper.id ?? payload.id,
    created_at: payload.created_at ?? wrapper.created_at ?? record.created_at,
    updated_at: payload.updated_at ?? wrapper.updated_at ?? record.updated_at,
  };
}

export function flattenForgeRows(values: unknown[]): unknown[] {
  return values.map(flattenForgeRow);
}
