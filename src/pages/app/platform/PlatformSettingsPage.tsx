import { useEffect, useState } from 'react';
import { FiPlus, FiSave } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Feedback';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useForgeTable } from '@/hooks/useForgeTable';
import { dataService } from '@/services/data.service';
import type { PlatformSetting } from '@/types/domain';
import { notifyError, notifySuccess } from '@/utils/alerts';
import { getErrorMessage } from '@/utils/format';

function normalizeValue(value: unknown): unknown {
  let current = value;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (typeof current !== 'string') return current;

    const text = current
      .trim()
      .replace(/^'/, '')
      .replace(/'::jsonb$/i, '')
      .replace(/::jsonb$/i, '')
      .replace(/'$/, '');

    try {
      current = JSON.parse(text) as unknown;
    } catch {
      return value;
    }
  }

  return current;
}

export default function PlatformSettingsPage() {
  const { rows: settings, loading, error, reload } = useForgeTable<PlatformSetting>(
    'platform_settings',
    { order: 'key.asc' },
  );

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: '', value: '{}', description: '' });

  useEffect(() => {
    const next: Record<string, string> = {};
    settings.forEach((setting) => {
      next[setting.key] = JSON.stringify(normalizeValue(setting.value), null, 2);
    });
    setDrafts(next);
  }, [settings]);

  async function saveSetting(setting: PlatformSetting) {
    setSavingKey(setting.key);
    try {
      const value = JSON.parse(drafts[setting.key] ?? '{}') as Record<string, unknown>;
      await dataService.updateRow<PlatformSetting>('platform_settings', setting.id, { value });
      notifySuccess('Paramètre plateforme enregistré', setting.key);
      reload();
    } catch (saveError) {
      notifyError('Enregistrement impossible', getErrorMessage(saveError));
    } finally {
      setSavingKey(null);
    }
  }

  async function createSetting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey('new');
    try {
      const value = JSON.parse(newSetting.value) as Record<string, unknown>;
      await dataService.createRow<PlatformSetting>('platform_settings', {
        key: newSetting.key.trim(),
        value,
        description: newSetting.description.trim() || null,
      });
      notifySuccess('Paramètre plateforme créé');
      setModalOpen(false);
      setNewSetting({ key: '', value: '{}', description: '' });
      reload();
    } catch (createError) {
      notifyError('Création impossible', getErrorMessage(createError));
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Console plateforme"
        title="Paramètres de la plateforme"
        description="Paramètres globaux : identité de la plateforme, support, devise par défaut, maintenance et politiques communes."
        actions={
          <Button onClick={() => setModalOpen(true)} icon={<FiPlus className="h-4 w-4" />}>
            Nouveau paramètre
          </Button>
        }
      />

      {error && (
        <div className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {loading && (
        <p className="py-10 text-center text-sm text-body dark:text-body-dark">
          Chargement des paramètres plateforme…
        </p>
      )}

      <div className="space-y-4">
        {settings.map((setting) => (
          <div key={setting.id} className="card-root border border-stroke p-5 dark:border-white/10">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold text-primary">{setting.key}</p>
                <p className="text-xs text-body dark:text-body-dark">
                  {setting.description ?? 'Paramètre global de la plateforme'}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => void saveSetting(setting)}
                loading={savingKey === setting.key}
                icon={<FiSave className="h-3.5 w-3.5" />}
              >
                Enregistrer
              </Button>
            </div>
            <Textarea
              rows={Math.min(12, Math.max(4, (drafts[setting.key] ?? '').split('\n').length + 1))}
              value={drafts[setting.key] ?? ''}
              onChange={(event) =>
                setDrafts((current) => ({ ...current, [setting.key]: event.target.value }))
              }
              className="font-mono text-xs"
            />
          </div>
        ))}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Nouveau paramètre plateforme"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" form="platform-setting-form" loading={savingKey === 'new'}>
              Créer
            </Button>
          </>
        }
      >
        <form id="platform-setting-form" onSubmit={createSetting} className="space-y-4">
          <Field label="Clé" required>
            <Input
              required
              value={newSetting.key}
              placeholder="platform_name"
              onChange={(event) =>
                setNewSetting((current) => ({ ...current, key: event.target.value }))
              }
            />
          </Field>
          <Field label="Description">
            <Input
              value={newSetting.description}
              onChange={(event) =>
                setNewSetting((current) => ({ ...current, description: event.target.value }))
              }
            />
          </Field>
          <Field label="Valeur JSON" required>
            <Textarea
              required
              rows={6}
              className="font-mono text-xs"
              value={newSetting.value}
              onChange={(event) =>
                setNewSetting((current) => ({ ...current, value: event.target.value }))
              }
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
