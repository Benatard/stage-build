import { useMemo } from 'react';
import { FiDownload, FiTrendingUp, FiUserCheck, FiUsers } from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import type { FinalEvaluation, Note, Presence } from '@/types/domain';
import { average, fullName, percentage, round } from '@/utils/format';
import { downloadCsv } from '@/utils/csv';

type FormationStat = {
  id: string;
  name: string;
  inscrits: number;
  average: number;
  successRate: number;
};

type Distribution = {
  range: string;
  count: number;
  percent: number;
};

export default function RapportsPage() {
  const { data } = useReferenceData();
  const { rows: presences } = useForgeTable<Presence>('presences', { limit: 500 });
  const { rows: notes } = useForgeTable<Note>('notes', { limit: 500 });
  const { rows: finals } = useForgeTable<FinalEvaluation>('final_evaluations', {
    limit: 500,
    order: 'created_at.desc',
  });

  const normalizedNotes = useMemo(
    () =>
      notes
        .filter((note) => note.score !== null && note.score !== undefined)
        .map((note) => round(((note.score ?? 0) / (note.max_score || 20)) * 20, 2)),
    [notes],
  );

  const attendanceRate = useMemo(() => {
    const present = presences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    return percentage(present, Math.max(presences.length, 1));
  }, [presences]);

  const finalAverage = average(finals.map((item) => item.final_average));
  const successRate = percentage(
    finals.filter((item) => item.decision === 'valide').length,
    Math.max(finals.length, 1),
  );

  const formationStats = useMemo<FormationStat[]>(() => {
    return data.formations.map((formation) => {
      const inscriptions = data.inscriptions.filter(
        (inscription) => inscription.formation_id === formation.id,
      );
      const stagiaireIds = new Set(inscriptions.map((inscription) => inscription.stagiaire_id));

      const formationNotes = notes.filter((note) => {
        const evaluation = data.evaluations.find((item) => item.id === note.evaluation_id);
        return (
          evaluation?.formation_id === formation.id ||
          stagiaireIds.has(note.stagiaire_id)
        );
      });

      const normalized = formationNotes
        .filter((note) => note.score !== null && note.score !== undefined)
        .map((note) => ((note.score ?? 0) / (note.max_score || 20)) * 20);

      const formationFinals = finals.filter((item) => stagiaireIds.has(item.stagiaire_id));

      return {
        id: formation.id,
        name: formation.name,
        inscrits: stagiaireIds.size,
        average: average(normalized),
        successRate: percentage(
          formationFinals.filter((item) => item.decision === 'valide').length,
          Math.max(formationFinals.length, 1),
        ),
      };
    });
  }, [data.formations, data.inscriptions, data.evaluations, notes, finals]);

  const distribution = useMemo<Distribution[]>(() => {
    const buckets = [
      { range: '0 – 4,99', min: 0, max: 5 },
      { range: '5 – 9,99', min: 5, max: 10 },
      { range: '10 – 13,99', min: 10, max: 14 },
      { range: '14 – 16,99', min: 14, max: 17 },
      { range: '17 – 20', min: 17, max: 20.01 },
    ];

    return buckets.map((bucket) => {
      const count = normalizedNotes.filter(
        (value) => value >= bucket.min && value < bucket.max,
      ).length;
      return {
        range: bucket.range,
        count,
        percent: percentage(count, Math.max(normalizedNotes.length, 1)),
      };
    });
  }, [normalizedNotes]);

  const columns: TableColumn<FormationStat>[] = [
    { key: 'name', header: 'Formation', render: (row) => row.name },
    { key: 'inscrits', header: 'Stagiaires inscrits', render: (row) => row.inscrits },
    {
      key: 'average',
      header: 'Moyenne générale',
      render: (row) => (
        <Badge tone={row.average >= 10 ? 'success' : 'danger'}>{row.average.toFixed(2)}/20</Badge>
      ),
    },
    {
      key: 'success',
      header: 'Taux de réussite',
      render: (row) => `${row.successRate}%`,
    },
    {
      key: 'bar',
      header: 'Réussite',
      render: (row) => (
        <div className="h-2 w-full max-w-[200px] bg-gray2 dark:bg-white/10">
          <div className="h-2 bg-primary" style={{ width: `${Math.min(100, row.successRate)}%` }} />
        </div>
      ),
    },
  ];

  function exportStagiaires() {
    downloadCsv(
      `stagiaires-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Matricule', 'Nom', 'Prénom', 'Email', 'Téléphone', 'Domaine', 'Spécialité', 'Statut'],
      data.stagiaires.map((stagiaire) => [
        stagiaire.matricule,
        stagiaire.nom,
        stagiaire.prenom,
        stagiaire.email,
        stagiaire.telephone,
        stagiaire.domaine,
        stagiaire.specialite,
        stagiaire.statut,
      ]),
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Résultats"
        title="Rapports & statistiques"
        description="Analysez les effectifs, les résultats, l’assiduité et la réussite par formation."
        actions={
          <Button variant="outline" onClick={exportStagiaires} icon={<FiDownload className="h-4 w-4" />}>
            Exporter les stagiaires (CSV)
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Stagiaires" value={data.stagiaires.length} hint={`${data.stagiaires.filter((item) => item.statut === 'actif').length} actifs`} icon={<FiUsers className="h-4 w-4" />} tone="primary" />
        <StatCard label="Moyenne finale" value={`${finalAverage.toFixed(2)}/20`} hint={`${finals.length} évaluation(s)`} icon={<FiTrendingUp className="h-4 w-4" />} tone={finalAverage >= 10 ? 'success' : 'danger'} />
        <StatCard label="Taux de réussite" value={`${successRate}%`} hint={`${finals.filter((item) => item.decision === 'valide').length} validé(s)`} icon={<FiUserCheck className="h-4 w-4" />} tone="success" />
        <StatCard label="Taux de présence" value={`${attendanceRate}%`} hint={`${presences.length} pointage(s)`} tone={attendanceRate >= 80 ? 'success' : 'warning'} />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="card-root border border-stroke p-5 dark:border-white/10">
          <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Répartition des notes</h2>
          <div className="space-y-3">
            {distribution.map((item) => (
              <div key={item.range}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-body dark:text-body-dark">{item.range}</span>
                  <span className="font-semibold text-dark dark:text-white">
                    {item.count} ({item.percent}%)
                  </span>
                </div>
                <div className="h-2.5 w-full bg-gray2 dark:bg-white/10">
                  <div
                    className={`h-2.5 ${item.range.startsWith('0') || item.range.startsWith('5') ? 'bg-rose-500' : 'bg-primary'}`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-body dark:text-body-dark">
            {normalizedNotes.length} note(s) analysée(s). Seuil de réussite : 10/20.
          </p>
        </div>

        <div className="card-root border border-stroke p-5 dark:border-white/10">
          <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Synthèse globale</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-body dark:text-body-dark">Formations</dt>
              <dd className="font-semibold text-dark dark:text-white">{data.formations.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-body dark:text-body-dark">Modules</dt>
              <dd className="font-semibold text-dark dark:text-white">{data.modules.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-body dark:text-body-dark">Promotions</dt>
              <dd className="font-semibold text-dark dark:text-white">{data.promotions.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-body dark:text-body-dark">Séances</dt>
              <dd className="font-semibold text-dark dark:text-white">{data.seances.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-body dark:text-body-dark">Évaluations</dt>
              <dd className="font-semibold text-dark dark:text-white">{data.evaluations.length}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-body dark:text-body-dark">Bulletins générés</dt>
              <dd className="font-semibold text-dark dark:text-white">{finals.length}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="card-root border border-stroke dark:border-white/10">
        <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
          <h2 className="text-sm font-bold text-black dark:text-white">Résultats par formation</h2>
        </div>
        <DataTable
          columns={columns}
          rows={formationStats}
          emptyTitle="Aucune formation"
          emptyDescription="Créez des formations et inscrivez des stagiaires pour obtenir des statistiques."
        />
      </div>

      <div className="mt-4 card-root border border-stroke dark:border-white/10">
        <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
          <h2 className="text-sm font-bold text-black dark:text-white">Dernières évaluations finales</h2>
        </div>
        <DataTable
          columns={[
            {
              key: 'stagiaire',
              header: 'Stagiaire',
              render: (row) => fullName(data.stagiaires.find((item) => item.id === row.stagiaire_id)),
            },
            { key: 'average', header: 'Moyenne', render: (row) => `${row.final_average ?? 0}/20` },
            {
              key: 'decision',
              header: 'Décision',
              render: (row) => (
                <Badge tone={row.decision === 'valide' ? 'success' : row.decision === 'non_valide' ? 'danger' : 'warning'}>
                  {row.decision.replace('_', ' ')}
                </Badge>
              ),
            },
          ]}
          rows={finals.slice(0, 10)}
          emptyTitle="Aucune évaluation finale"
          emptyDescription="Les évaluations finales apparaîtront ici."
        />
      </div>
    </div>
  );
}
