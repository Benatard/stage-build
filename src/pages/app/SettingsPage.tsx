import { useEffect, useState } from 'react';
import { FiEdit2, FiPlus, FiSave } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/Feedback';
import { Field, Input, Textarea } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useForgeTable } from '@/hooks/useForgeTable';
import { dataService } from '@/services/data.service';
import type { GradingRule, Setting } from '@/types/domain';
import { notifyError, notifySuccess } from '@/utils/alerts';

type RuleDraft = {
  category: string;
  weight: string;
  pass_mark: string;
  rounding: string;
};

const emptyRule: RuleDraft = { category: '', weight: '0', pass_mark: '10', rounding: '2' };

function normalizeSettingValue(value: unknown): unknown {
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

export default function SettingsPage() {
  const { rows: settings, loading, error, reload } = useForgeTable<Setting>('settings', {
    order: 'key.asc',
  });
  const { rows: rules, reload: reloadRules } = useForgeTable<GradingRule>('grading_rules');

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newSettingOpen, setNewSettingOpen] = useState(false);
  const [newSetting, setNewSetting] = useState({ key: '', value: '{}', description: '' });
  const [ruleModalOpen, setRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<GradingRule | null>(null);
  const [ruleDraft, setRuleDraft] = useState<RuleDraft>(emptyRule);
  const [savingRule, setSavingRule] = useState(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    settings.forEach((setting) => {
      next[setting.key] = JSON.stringify(normalizeSettingValue(setting.value), null, 2);
    });
    setDrafts(next);
  }, [settings]);

  async function saveSetting(setting: Setting) {
    setSavingKey(setting.key);
    try {
      const value = JSON.parse(drafts[setting.key] ?? '{}') as Record<string, unknown>;
      await dataService.updateRow<Setting>('settings', setting.id, { value });
      notifySuccess('Paramètre enregistré', setting.key);
      reload();
    } catch {
      notifyError('JSON invalide', 'Corrigez la syntaxe avant d’enregistrer.');
    } finally {
      setSavingKey(null);
    }
  }

  async function createSetting(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingKey('new');
    try {
      const value = JSON.parse(newSetting.value) as Record<string, unknown>;
      await dataService.createRow<Setting>('settings', {
        key: newSetting.key.trim(),
        value,
        description: newSetting.description.trim() || null,
      });
      notifySuccess('Paramètre créé');
      setNewSettingOpen(false);
      setNewSetting({ key: '', value: '{}', description: '' });
      reload();
    } catch {
      notifyError('Création impossible', 'Vérifiez la clé et la syntaxe JSON.');
    } finally {
      setSavingKey(null);
    }
  }

  function openRule(rule?: GradingRule) {
    setEditingRule(rule ?? null);
    setRuleDraft(
      rule
        ? {
            category: rule.category,
            weight: String(rule.weight),
            pass_mark: String(rule.pass_mark),
            rounding: String(rule.rounding),
          }
        : emptyRule,
    );
    setRuleModalOpen(true);
  }

  async function saveRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingRule(true);

    const payload = {
      category: ruleDraft.category.trim(),
      weight: Number(ruleDraft.weight) || 0,
      pass_mark: Number(ruleDraft.pass_mark) || 10,
      rounding: Number(ruleDraft.rounding) || 2,
    };

    try {
      if (editingRule) {
        await dataService.updateRow<GradingRule>('grading_rules', editingRule.id, payload);
        notifySuccess('Règle mise à jour');
      } else {
        await dataService.createRow<GradingRule>('grading_rules', payload);
        notifySuccess('Règle créée');
      }
      setRuleModalOpen(false);
      reloadRules();
    } catch {
      notifyError('Enregistrement impossible');
    } finally {
      setSavingRule(false);
    }
  }

  const ruleColumns: TableColumn<GradingRule>[] = [
    { key: 'category', header: 'Catégorie', render: (row) => <Badge tone="primary">{row.category}</Badge> },
    { key: 'weight', header: 'Poids', render: (row) => `${row.weight}%` },
    { key: 'pass', header: 'Seuil', render: (row) => `${row.pass_mark}/20` },
    { key: 'rounding', header: 'Arrondi', render: (row) => `${row.rounding} décimale(s)` },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => openRule(row)}
          className="flex h-8 w-8 items-center justify-center text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark"
        >
          <FiEdit2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Administration"
        title="Paramètres"
        description="Configurez l’organisation, les seuils de présence, les pondérations et les règles de calcul."
        actions={
          <Button onClick={() => setNewSettingOpen(true)} icon={<FiPlus className="h-4 w-4" />}>
            Nouveau paramètre
          </Button>
        }
      />

      {error && (
        <div className="mb-4 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading && (
          <p className="py-10 text-center text-sm text-body dark:text-body-dark">
            Chargement des paramètres…
          </p>
        )}

        {settings.map((setting) => (
          <div key={setting.id} className="card-root border border-stroke p-5 dark:border-white/10">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold text-primary">{setting.key}</p>
                <p className="text-xs text-body dark:text-body-dark">
                  {setting.description ?? 'Paramètre système'}
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

      <div className="mt-6 card-root border border-stroke dark:border-white/10">
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-sm font-bold text-black dark:text-white">Règles de notation</h2>
            <p className="text-xs text-body dark:text-body-dark">
              Pondérations par catégorie utilisées pour les calculs.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => openRule()} icon={<FiPlus className="h-3.5 w-3.5" />}>
            Ajouter
          </Button>
        </div>
        <DataTable columns={ruleColumns} rows={rules} />
      </div>

      <Modal
        open={newSettingOpen}
        onClose={() => setNewSettingOpen(false)}
        title="Nouveau paramètre"
        footer={
          <>
            <Button variant="outline" onClick={() => setNewSettingOpen(false)}>Annuler</Button>
            <Button type="submit" form="setting-form" loading={savingKey === 'new'}>Créer</Button>
          </>
        }
      >
        <form id="setting-form" onSubmit={createSetting} className="space-y-4">
          <Field label="Clé" required>
            <Input
              required
              value={newSetting.key}
              placeholder="nom_parametre"
              onChange={(event) => setNewSetting((current) => ({ ...current, key: event.target.value }))}
            />
          </Field>
          <Field label="Description">
            <Input
              value={newSetting.description}
              onChange={(event) => setNewSetting((current) => ({ ...current, description: event.target.value }))}
            />
          </Field>
          <Field label="Valeur JSON" required>
            <Textarea
              required
              rows={6}
              className="font-mono text-xs"
              value={newSetting.value}
              onChange={(event) => setNewSetting((current) => ({ ...current, value: event.target.value }))}
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={ruleModalOpen}
        onClose={() => setRuleModalOpen(false)}
        title={editingRule ? 'Modifier la règle' : 'Nouvelle règle de notation'}
        footer={
          <>
            <Button variant="outline" onClick={() => setRuleModalOpen(false)}>Annuler</Button>
            <Button type="submit" form="rule-form" loading={savingRule}>Enregistrer</Button>
          </>
        }
      >
        <form id="rule-form" onSubmit={saveRule} className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie" required className="sm:col-span-2">
            <Input
              required
              value={ruleDraft.category}
              placeholder="qcm, tp, examen, projet…"
              onChange={(event) => setRuleDraft((current) => ({ ...current, category: event.target.value }))}
            />
          </Field>
          <Field label="Poids (%)" required>
            <Input
              type="number"
              min={0}
              max={100}
              required
              value={ruleDraft.weight}
              onChange={(event) => setRuleDraft((current) => ({ ...current, weight: event.target.value }))}
            />
          </Field>
          <Field label="Seuil (/20)" required>
            <Input
              type="number"
              min={0}
              max={20}
              step={0.5}
              required
              value={ruleDraft.pass_mark}
              onChange={(event) => setRuleDraft((current) => ({ ...current, pass_mark: event.target.value }))}
            />
          </Field>
          <Field label="Arrondi (décimales)" required>
            <Input
              type="number"
              min={0}
              max={4}
              required
              value={ruleDraft.rounding}
              onChange={(event) => setRuleDraft((current) => ({ ...current, rounding: event.target.value }))}
            />
          </Field>
        </form>
      </Modal>
    </div>
  );
}
