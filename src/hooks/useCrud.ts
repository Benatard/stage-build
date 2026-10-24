import { useCallback, useState } from 'react';
import { dataService } from '@/services/data.service';
import { getErrorMessage } from '@/utils/format';

type UseCrudOptions = {
  onSuccess?: () => void;
};

export function useCrud(table: string, options: UseCrudOptions = {}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(
    async <T extends { id: string }>(payload: Record<string, unknown>): Promise<T | null> => {
      setSaving(true);
      setError(null);
      try {
        const row = await dataService.createRow<T>(table, payload);
        options.onSuccess?.();
        return row;
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Création impossible.'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [table, options],
  );

  const update = useCallback(
    async <T extends { id: string }>(
      id: string,
      payload: Record<string, unknown>,
    ): Promise<T | null> => {
      setSaving(true);
      setError(null);
      try {
        const row = await dataService.updateRow<T>(table, id, payload);
        options.onSuccess?.();
        return row;
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Mise à jour impossible.'));
        return null;
      } finally {
        setSaving(false);
      }
    },
    [table, options],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setDeleting(true);
      setError(null);
      try {
        await dataService.deleteRow(table, id);
        options.onSuccess?.();
        return true;
      } catch (requestError) {
        setError(getErrorMessage(requestError, 'Suppression impossible.'));
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [table, options],
  );

  return { create, update, remove, saving, deleting, error, setError };
}
