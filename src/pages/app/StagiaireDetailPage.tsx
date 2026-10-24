import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiFileText,
  FiMail,
  FiPhone,
  FiTarget,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import AccessDeniedPage from './AccessDeniedPage';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import {
  COMPETENCE_LEVEL_OPTIONS,
  EVALUATION_TYPE_OPTIONS,
  OBJECTIVE_STATUS_OPTIONS,
  PRESENCE_OPTIONS,
  STAGIAIRE_STATUS_OPTIONS,
  optionLabel,
} from '@/config/options';
import type {
  Bulletin,
  CompetenceEvaluation,
  FinalEvaluation,
  ImprovementPlan,
  Inscription,
  Note,
  Observation,
  Presence,
  StageJournal,
  StageObjective,
} from '@/types/domain';
import {
  average,
  formatDate,
  formatDateTime,
  fullName,
  initials,
  percentage,
  round,
} from '@/utils/format';

type Tab = 'apercu' | 'notes' | 'presences' | 'competences' | 'suivi';

export default function StagiaireDetailPage() {
  const { id = '' } = useParams();
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('apercu');

  const stagiaire = data.stagiaires.find((item) => item.id === id);

  const enabled = Boolean(id);
  const { rows: notes } = useForgeTable<Note>('notes', { filters: { stagiaire_id: id }, enabled });
  const { rows: presences } = useForgeTable<Presence>('presences', { filters: { stagiaire_id: id }, enabled });
  const { rows: competencies } = useForgeTable<CompetenceEvaluation>('competence_levels', {
    filters: { stagiaire_id: id },
    order: 'evaluated_at.desc',
    enabled,
  });
  const { rows: observations } = useForgeTable<Observation>('observations', {
    filters: { stagiaire_id: id },
    order: 'created_at.desc',
    enabled,
  });
  const { rows: objectives } = useForgeTable<StageObjective>('stage_objectives', {
    filters: { stagiaire_id: id },
    enabled,
  });
  const { rows: plans } = useForgeTable<ImprovementPlan>('improvement_plans', {
    filters: { stagiaire_id: id },
    enabled,
  });
  const { rows: journal } = useForgeTable<StageJournal>('stage_journal', {
    filters: { stagiaire_id: id },
    order: 'date.desc',
    enabled,
  });
  const { rows: finals } = useForgeTable<FinalEvaluation>('final_evaluations', {
    filters: { stagiaire_id: id },
    order: 'created_at.desc',
    enabled,
  });
  const { rows: bulletins } = useForgeTable<Bulletin>('bulletins', {
    filters: { stagiaire_id: id },
    order: 'generated_at.desc',
    enabled,
  });

  const latestCompetencies = useMemo(() => {
    const seen = new Set<string>();
    return competencies.filter((level) => {
      if (seen.has(level.competence_id)) return false;
      seen.add(level.competence_id);
      return true;
    });
  }, [competencies]);

  const inscriptions = data.inscriptions.filter((inscription) => inscription.stagiaire_id === id);
  const finalEvaluation = finals[0];
  const latestBulletin = bulletins[0];

  if (!stagiaire) {
    return (
      <div>
        <PageHeader title="Dossier introuvable" description="Ce stagiaire n’existe pas ou a été supprimé." />
        <Link to="/app/stagiaires">
          <Button variant="outline" icon={<FiArrowLeft className="h-4 w-4" />}>Retour aux stagiaires</Button>
        </Link>
      </div>
    );
  }

  if (user?.role === 'stagiaire' && user.stagiaire_id && user.stagiaire_id !== stagiaire.id) {
    return <AccessDeniedPage />;
  }

  const normalizedNotes = notes
    .filter((note) => note.score !== null && note.score !== undefined)
    .map((note) => round(((note.score ?? 0) / (note.max_score || 20)) * 20, 2));
  const noteAverage = average(normalizedNotes);
  const presentCount = presences.filter((presence) =>
    ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
  ).length;
  const attendanceRate = percentage(presentCount, Math.max(presences.length, 1));
  const acquiredCount = latestCompetencies.filter((level) =>
    ['acquis', 'maitrise'].includes(level.level),
  ).length;

  const noteColumns: TableColumn<Note>[] = [
    {
      key: 'evaluation',
      header: 'Évaluation',
      render: (row) => {
        const evaluation = data.evaluations.find((item) => item.id === row.evaluation_id);
        return (
          <div>
            <p className="font-semibold text-black dark:text-white">{evaluation?.title ?? '—'}</p>
            <p className="text-xs text-body dark:text-body-dark">
              {optionLabel(EVALUATION_TYPE_OPTIONS, evaluation?.type)} · {formatDate(evaluation?.date)}
            </p>
          </div>
        );
      },
    },
    {
      key: 'module',
      header: 'Module',
      hideBelow: 'md',
      render: (row) => {
        const evaluation = data.evaluations.find((item) => item.id === row.evaluation_id);
        return data.modules.find((module) => module.id === evaluation?.module_id)?.name ?? '—';
      },
    },
    {
      key: 'score',
      header: 'Note',
      render: (row) =>
        row.score !== null && row.score !== undefined ? (
          <Badge tone={statusTone(((row.score / (row.max_score || 20)) * 20) >= 10 ? 'acquis' : 'non_acquis')}>
            {row.score}/{row.max_score}
          </Badge>
        ) : '—',
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
  ];

  const presenceColumns: TableColumn<Presence>[] = [
    {
      key: 'seance',
      header: 'Séance',
      render: (row) => {
        const seance = data.seances.find((item) => item.id === row.seance_id);
        return (
          <div>
            <p className="font-semibold text-black dark:text-white">
              {seance?.title ?? data.modules.find((module) => module.id === seance?.module_id)?.name ?? 'Séance'}
            </p>
            <p className="text-xs text-body dark:text-body-dark">{formatDate(seance?.date)}</p>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => (
        <Badge tone={statusTone(row.status)}>{optionLabel(PRESENCE_OPTIONS, row.status)}</Badge>
      ),
    },
    {
      key: 'note',
      header: 'Justification',
      hideBelow: 'md',
      render: (row) => row.note ?? '—',
    },
    {
      key: 'recorded',
      header: 'Pointé le',
      hideBelow: 'lg',
      render: (row) => formatDateTime(row.recorded_at),
    },
  ];

  const objectiveColumns: TableColumn<StageObjective>[] = [
    { key: 'title', header: 'Objectif', render: (row) => row.title },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => <Badge tone={statusTone(row.status)}>{optionLabel(OBJECTIVE_STATUS_OPTIONS, row.status)}</Badge>,
    },
    { key: 'comment', header: 'Validation', hideBelow: 'md', render: (row) => row.validation_comment ?? '—' },
  ];

  const journalColumns: TableColumn<StageJournal>[] = [
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    { key: 'activity', header: 'Activité', render: (row) => row.activity },
    { key: 'competence', header: 'Compétence', hideBelow: 'md', render: (row) => row.competence ?? '—' },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
  ];

  const bulletinColumns: TableColumn<Bulletin>[] = [
    { key: 'date', header: 'Généré le', render: (row) => formatDate(row.generated_at) },
    { key: 'period', header: 'Période', render: (row) => row.period ?? '—' },
    { key: 'status', header: 'Statut', render: (row) => <Badge tone={statusTone(row.status)}>{row.status}</Badge> },
  ];

  return (
    <div>
      <Link to="/app/stagiaires" className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-body hover:text-primary dark:text-body-dark">
        <FiArrowLeft className="h-4 w-4" /> Retour aux stagiaires
      </Link>

      <div className="card-root mb-5 border border-stroke p-5 dark:border-white/10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center bg-primary text-xl font-bold text-white">
              {initials(fullName(stagiaire))}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-black dark:text-white">{fullName(stagiaire)}</h1>
                <Badge tone={statusTone(stagiaire.statut)}>{optionLabel(STAGIAIRE_STATUS_OPTIONS, stagiaire.statut)}</Badge>
              </div>
              <p className="mt-1 text-sm text-body dark:text-body-dark">
                {stagiaire.matricule} · {stagiaire.domaine ?? 'Domaine non précisé'} · {stagiaire.specialite ?? 'Spécialité non précisée'}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-body dark:text-body-dark">
                <span className="flex items-center gap-1.5"><FiMail className="h-3.5 w-3.5" /> {stagiaire.email ?? '—'}</span>
                <span className="flex items-center gap-1.5"><FiPhone className="h-3.5 w-3.5" /> {stagiaire.telephone ?? '—'}</span>
                <span className="flex items-center gap-1.5"><FiCalendar className="h-3.5 w-3.5" /> Né(e) le {formatDate(stagiaire.date_naissance)}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/app/notes"><Button size="sm" variant="outline" icon={<FiClipboard className="h-4 w-4" />}>Notes</Button></Link>
            <Link to="/app/presences"><Button size="sm" variant="outline" icon={<FiCheckCircle className="h-4 w-4" />}>Présences</Button></Link>
            <Link to="/app/bulletins"><Button size="sm" icon={<FiFileText className="h-4 w-4" />}>Bulletin</Button></Link>
          </div>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Moyenne" value={`${noteAverage.toFixed(2)}/20`} tone={noteAverage >= 10 ? 'success' : 'danger'} icon={<FiTrendingUp className="h-4 w-4" />} />
        <StatCard label="Présence" value={`${attendanceRate}%`} tone={attendanceRate >= 80 ? 'success' : 'warning'} icon={<FiCheckCircle className="h-4 w-4" />} />
        <StatCard label="Compétences" value={`${acquiredCount}/${latestCompetencies.length}`} tone="purple" icon={<FiAward className="h-4 w-4" />} />
        <StatCard label="Moyenne finale" value={finalEvaluation?.final_average !== null && finalEvaluation?.final_average !== undefined ? `${finalEvaluation.final_average}/20` : '—'} tone="primary" icon={<FiTarget className="h-4 w-4" />} />
      </div>

      <div className="mb-5 flex flex-wrap gap-1 border-b border-stroke dark:border-white/10">
        {[
          { key: 'apercu' as const, label: 'Aperçu' },
          { key: 'notes' as const, label: `Notes (${notes.length})` },
          { key: 'presences' as const, label: `Présences (${presences.length})` },
          { key: 'competences' as const, label: `Compétences (${latestCompetencies.length})` },
          { key: 'suivi' as const, label: 'Suivi pédagogique' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              tab === item.key
                ? 'border-primary text-primary'
                : 'border-transparent text-body hover:text-dark dark:text-body-dark dark:hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'apercu' && (
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="card-root border border-stroke p-5 dark:border-white/10">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-black dark:text-white">
              <FiUser className="h-4 w-4 text-primary" /> Informations administratives
            </h2>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              {[
                ['Sexe', stagiaire.sexe ?? '—'],
                ['Date de naissance', formatDate(stagiaire.date_naissance)],
                ['Lieu de naissance', stagiaire.lieu_naissance ?? '—'],
                ['Adresse', stagiaire.adresse ?? '—'],
                ['Établissement', stagiaire.etablissement_origine ?? '—'],
                ['Niveau d’études', stagiaire.niveau_etudes ?? '—'],
                ['Diplôme', stagiaire.diplome ?? '—'],
                ['Contact d’urgence', stagiaire.contact_urgence_nom ?? '—'],
                ['Téléphone d’urgence', stagiaire.contact_urgence_telephone ?? '—'],
                ['Créé le', formatDate(stagiaire.created_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs uppercase tracking-wide text-body dark:text-body-dark">{label}</dt>
                  <dd className="mt-0.5 font-medium text-dark dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="space-y-5">
            <div className="card-root border border-stroke p-5 dark:border-white/10">
              <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Inscriptions</h2>
              {inscriptions.length === 0 ? (
                <p className="text-sm text-body dark:text-body-dark">Aucune inscription enregistrée.</p>
              ) : (
                <div className="space-y-2">
                  {inscriptions.map((inscription: Inscription) => (
                    <div key={inscription.id} className="flex items-center justify-between gap-3 border border-stroke px-3 py-2 text-sm dark:border-white/10">
                      <div>
                        <p className="font-medium text-black dark:text-white">
                          {data.formations.find((formation) => formation.id === inscription.formation_id)?.name ?? 'Formation'}
                        </p>
                        <p className="text-xs text-body dark:text-body-dark">
                          {data.promotions.find((promotion) => promotion.id === inscription.promotion_id)?.code ?? 'Sans promotion'} · {formatDate(inscription.start_date)}
                        </p>
                      </div>
                      <Badge tone={statusTone(inscription.status)}>{inscription.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-root border border-stroke p-5 dark:border-white/10">
              <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Évaluation finale</h2>
              {finalEvaluation ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-body dark:text-body-dark">Moyenne finale</span>
                    <strong className="text-black dark:text-white">{finalEvaluation.final_average ?? 0}/20</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-body dark:text-body-dark">Décision</span>
                    <Badge tone={statusTone(finalEvaluation.decision)}>{finalEvaluation.decision}</Badge>
                  </div>
                  <p className="text-xs text-body dark:text-body-dark">{finalEvaluation.appreciation ?? 'Aucune appréciation.'}</p>
                </div>
              ) : (
                <p className="text-sm text-body dark:text-body-dark">Aucune évaluation finale enregistrée.</p>
              )}
            </div>

            <div className="card-root border border-stroke p-5 dark:border-white/10">
              <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Bulletins</h2>
              {latestBulletin ? (
                <p className="text-sm text-body dark:text-body-dark">
                  Dernier bulletin : {formatDate(latestBulletin.generated_at)} · {latestBulletin.status}
                </p>
              ) : (
                <p className="text-sm text-body dark:text-body-dark">Aucun bulletin généré.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <div className="card-root border border-stroke dark:border-white/10">
          <DataTable columns={noteColumns} rows={notes} emptyTitle="Aucune note" emptyDescription="Les notes de ce stagiaire apparaîtront ici." />
        </div>
      )}

      {tab === 'presences' && (
        <div className="card-root border border-stroke dark:border-white/10">
          <DataTable columns={presenceColumns} rows={presences} emptyTitle="Aucune présence" emptyDescription="Les pointages de ce stagiaire apparaîtront ici." />
        </div>
      )}

      {tab === 'competences' && (
        <div className="card-root border border-stroke dark:border-white/10">
          {latestCompetencies.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-body dark:text-body-dark">Aucune compétence évaluée.</p>
          ) : (
            <div className="divide-y divide-stroke dark:divide-white/5">
              {latestCompetencies.map((level) => (
                <div key={level.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-black dark:text-white">
                      {data.competences.find((competence) => competence.id === level.competence_id)?.name ?? 'Compétence'}
                    </p>
                    <p className="text-xs text-body dark:text-body-dark">
                      Évaluée le {formatDate(level.evaluated_at)} · {level.comment ?? 'Sans commentaire'}
                    </p>
                  </div>
                  <Badge tone={statusTone(level.level)}>{optionLabel(COMPETENCE_LEVEL_OPTIONS, level.level)}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'suivi' && (
        <div className="space-y-5">
          <div className="card-root border border-stroke dark:border-white/10">
            <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold text-black dark:text-white">Objectifs de stage</h2>
            </div>
            <DataTable columns={objectiveColumns} rows={objectives} emptyTitle="Aucun objectif" emptyDescription="Définissez les objectifs de stage." />
          </div>

          <div className="card-root border border-stroke p-5 dark:border-white/10">
            <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Plans d’amélioration</h2>
            {plans.length === 0 ? (
              <p className="text-sm text-body dark:text-body-dark">Aucun plan d’amélioration.</p>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <div key={plan.id} className="border border-stroke p-3 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-black dark:text-white">{plan.objective}</p>
                      <Badge tone={statusTone(plan.status)}>{plan.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-body dark:text-body-dark">{plan.difficulty}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-root border border-stroke dark:border-white/10">
            <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold text-black dark:text-white">Observations</h2>
            </div>
            {observations.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">Aucune observation.</p>
            ) : (
              <div className="divide-y divide-stroke dark:divide-white/5">
                {observations.slice(0, 10).map((observation) => (
                  <div key={observation.id} className="px-5 py-3">
                    <p className="text-sm text-dark dark:text-white">{observation.content}</p>
                    <p className="mt-1 text-xs text-body dark:text-body-dark">
                      {formatDateTime(observation.created_at)} · visibilité : {observation.visibility}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card-root border border-stroke dark:border-white/10">
            <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold text-black dark:text-white">Journal de stage</h2>
            </div>
            <DataTable columns={journalColumns} rows={journal} emptyTitle="Journal vide" emptyDescription="Les activités de stage apparaîtront ici." />
          </div>

          <div className="card-root border border-stroke dark:border-white/10">
            <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
              <h2 className="text-sm font-bold text-black dark:text-white">Historique des bulletins</h2>
            </div>
            <DataTable columns={bulletinColumns} rows={bulletins} emptyTitle="Aucun bulletin" emptyDescription="Générez un bulletin pour ce stagiaire." />
          </div>
        </div>
      )}
    </div>
  );
}
