import { useMemo, useState } from 'react';
import { FiCheckCircle, FiFileText, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Form';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import type { Bulletin, FinalEvaluation, Note, Presence } from '@/types/domain';
import { confirmAction, confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { average, formatDate, fullName, percentage, round, todayISO } from '@/utils/format';
import { buildOptions } from '@/utils/options';

export default function BulletinsPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [stagiaireId, setStagiaireId] = useState(user?.stagiaire_id ?? '');
  const [saving, setSaving] = useState(false);

  const enabled = Boolean(stagiaireId);

  const { rows: finals } = useForgeTable<FinalEvaluation>('final_evaluations', {
    filters: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled,
  });
  const { rows: notes } = useForgeTable<Note>('notes', {
    filters: { stagiaire_id: stagiaireId },
    enabled,
  });
  const { rows: presences } = useForgeTable<Presence>('presences', {
    filters: { stagiaire_id: stagiaireId },
    enabled,
  });
  const { rows: bulletins, loading, reload } = useForgeTable<Bulletin>('bulletins', {
    filters: { stagiaire_id: stagiaireId },
    order: 'generated_at.desc',
    enabled,
  });

  const stagiaire = data.stagiaires.find((item) => item.id === stagiaireId);
  const final = finals[0];

  const moduleStats = useMemo(() => {
    const groups = new Map<string, { name: string; values: number[]; coefficient: number }>();
    notes.forEach((note) => {
      if (note.score === null || note.score === undefined) return;
      const evaluation = data.evaluations.find((item) => item.id === note.evaluation_id);
      const module = data.modules.find((item) => item.id === evaluation?.module_id);
      const key = module?.id ?? 'sans-module';
      const current = groups.get(key) ?? {
        name: module?.name ?? 'Sans module',
        values: [],
        coefficient: module?.coefficient ?? 1,
      };
      current.values.push(round((note.score / (note.max_score || 20)) * 20, 2));
      groups.set(key, current);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      average: average(group.values),
    }));
  }, [notes, data.evaluations, data.modules]);

  const attendanceRate = useMemo(() => {
    const present = presences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    return percentage(present, Math.max(presences.length, 1));
  }, [presences]);

  async function generate(publish = false) {
    if (!stagiaire || !final) {
      notifyError('Données insuffisantes', 'Une évaluation finale est nécessaire avant de générer le bulletin.');
      return;
    }

    const confirmed = await confirmAction({
      title: publish ? 'Générer et publier' : 'Générer le bulletin',
      text: 'Le bulletin sera généré à partir des résultats actuels.',
      confirmText: publish ? 'Publier' : 'Générer',
    });
    if (!confirmed) return;

    setSaving(true);

    const content = {
      organization: {
        name: 'StageBuild',
        address: 'Plateforme de gestion et de suivi des stagiaires',
      },
      stagiaire: {
        id: stagiaire.id,
        matricule: stagiaire.matricule,
        nom: fullName(stagiaire),
        domaine: stagiaire.domaine,
        specialite: stagiaire.specialite,
      },
      final: {
        modules_average: final.modules_average,
        qcm_average: final.qcm_average,
        tp_average: final.tp_average,
        project_average: final.project_average,
        implication_average: final.implication_average,
        professionalism_average: final.professionalism_average,
        attendance_rate: final.attendance_rate,
        final_average: final.final_average,
        decision: final.decision,
        appreciation: final.appreciation,
      },
      modules: moduleStats,
      attendance_rate: attendanceRate,
      generated_at: new Date().toISOString(),
    };

    try {
      await dataService.createRow<Bulletin>('bulletins', {
        stagiaire_id: stagiaire.id,
        final_evaluation_id: final.id,
        period: todayISO().slice(0, 7),
        content,
        status: publish ? 'publie' : 'brouillon',
        generated_by: user?.id ?? null,
        generated_at: new Date().toISOString(),
        published_by: publish ? user?.id ?? null : null,
        published_at: publish ? new Date().toISOString() : null,
      });
      notifySuccess(publish ? 'Bulletin publié' : 'Bulletin généré');
      reload();
    } catch {
      notifyError('Génération impossible');
    } finally {
      setSaving(false);
    }
  }

  async function publishBulletin(bulletin: Bulletin) {
    try {
      await dataService.updateRow<Bulletin>('bulletins', bulletin.id, {
        status: 'publie',
        published_by: user?.id ?? null,
        published_at: new Date().toISOString(),
      });
      notifySuccess('Bulletin publié');
      reload();
    } catch {
      notifyError('Publication impossible');
    }
  }

  async function deleteBulletin(bulletin: Bulletin) {
    const confirmed = await confirmDelete('ce bulletin');
    if (!confirmed) return;
    try {
      await dataService.deleteRow('bulletins', bulletin.id);
      notifySuccess('Bulletin supprimé');
      reload();
    } catch {
      notifyError('Suppression impossible');
    }
  }

  const columns: TableColumn<Bulletin>[] = [
    { key: 'date', header: 'Généré le', render: (row) => formatDate(row.generated_at) },
    { key: 'period', header: 'Période', hideBelow: 'md', render: (row) => row.period ?? '—' },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge>
      ),
    },
    {
      key: 'published',
      header: 'Publié le',
      hideBelow: 'md',
      render: (row) => (row.published_at ? formatDate(row.published_at) : '—'),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-1">
          {row.status !== 'publie' && (
            <button
              type="button"
              onClick={() => void publishBulletin(row)}
              className="flex h-8 w-8 items-center justify-center text-body hover:bg-emerald-50 hover:text-emerald-600 dark:text-body-dark"
              title="Publier"
            >
              <FiCheckCircle className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void deleteBulletin(row)}
            className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 dark:text-body-dark"
            title="Supprimer"
          >
            <FiTrash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Résultats"
        title="Bulletins"
        description="Générez, publiez et imprimez les bulletins de fin de formation."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void generate(false)}
              loading={saving}
              disabled={!stagiaireId || !final}
              icon={<FiFileText className="h-4 w-4" />}
            >
              Générer
            </Button>
            <Button
              onClick={() => void generate(true)}
              loading={saving}
              disabled={!stagiaireId || !final}
              icon={<FiCheckCircle className="h-4 w-4" />}
            >
              Générer et publier
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              disabled={!final}
              icon={<FiPrinter className="h-4 w-4" />}
            >
              Imprimer
            </Button>
          </>
        }
      />

      <div className="mb-5 card-root border border-stroke p-5 dark:border-white/10">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
          Stagiaire
        </label>
        <Select
          value={stagiaireId}
          placeholder="Sélectionner un stagiaire…"
          options={buildOptions(data.stagiaires, (item) => `${fullName(item)} (${item.matricule})`)}
          onChange={(event) => setStagiaireId(event.target.value)}
        />
        {stagiaireId && !final && (
          <p className="mt-3 text-sm text-amber-600">
            Aucune évaluation finale enregistrée. Complétez d’abord l’évaluation finale du stagiaire.
          </p>
        )}
      </div>

      {stagiaire && final && (
        <div id="print-area" className="mb-6 border border-stroke bg-white p-8 text-black dark:border-white/10">
          <div className="flex items-start justify-between border-b-2 border-black pb-5">
            <div>
              <p className="text-xl font-extrabold tracking-tight">StageBuild</p>
              <p className="text-xs">Gestion et suivi des stagiaires</p>
              <p className="mt-1 text-xs">Plateforme pédagogique centralisée</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold uppercase tracking-wide">Bulletin de fin de formation</p>
              <p className="text-xs">Année académique {new Date().getFullYear()}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <p><strong>Stagiaire :</strong> {fullName(stagiaire)}</p>
            <p><strong>Matricule :</strong> {stagiaire.matricule}</p>
            <p><strong>Domaine :</strong> {stagiaire.domaine ?? '—'}</p>
            <p><strong>Spécialité :</strong> {stagiaire.specialite ?? '—'}</p>
          </div>

          <table className="mt-6 w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-2">Module</th>
                <th className="py-2 text-center">Coefficient</th>
                <th className="py-2 text-right">Moyenne /20</th>
              </tr>
            </thead>
            <tbody>
              {moduleStats.map((module) => (
                <tr key={module.name} className="border-b border-slate-300">
                  <td className="py-2">{module.name}</td>
                  <td className="py-2 text-center">{module.coefficient}</td>
                  <td className="py-2 text-right font-semibold">{module.average.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p>QCM : <strong>{final.qcm_average ?? 0}/20</strong></p>
              <p>Travaux pratiques : <strong>{final.tp_average ?? 0}/20</strong></p>
              <p>Projet final : <strong>{final.project_average ?? 0}/20</strong></p>
            </div>
            <div className="space-y-1">
              <p>Implication : <strong>{final.implication_average ?? 0}/5</strong></p>
              <p>Comportement : <strong>{final.professionalism_average ?? 0}/5</strong></p>
              <p>Taux de présence : <strong>{final.attendance_rate ?? attendanceRate}%</strong></p>
            </div>
          </div>

          <div className="mt-6 border-2 border-black p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide">Moyenne finale</p>
                <p className="text-3xl font-extrabold">{final.final_average ?? 0}/20</p>
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide">Décision</p>
                <p className="text-lg font-bold uppercase">
                  {final.decision === 'valide' ? 'Validé' : final.decision === 'non_valide' ? 'Non validé' : 'En attente'}
                </p>
              </div>
            </div>
            {final.appreciation && <p className="mt-3 text-sm"><strong>Appréciation :</strong> {final.appreciation}</p>}
          </div>

          <div className="mt-8 flex justify-between text-xs">
            <div>
              <p>Fait le {formatDate(new Date().toISOString())}</p>
            </div>
            <div className="text-right">
              <p>La Direction</p>
              <p className="mt-8 border-t border-black pt-2">Signature et cachet</p>
            </div>
          </div>
        </div>
      )}

      {stagiaireId && (
        <div className="card-root border border-stroke dark:border-white/10">
          <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
            <h2 className="text-sm font-bold text-black dark:text-white">Historique des bulletins</h2>
          </div>
          <DataTable
            columns={columns}
            rows={bulletins}
            loading={loading}
            onRetry={reload}
            emptyTitle="Aucun bulletin"
            emptyDescription="Générez le premier bulletin de ce stagiaire."
          />
        </div>
      )}
    </div>
  );
}
