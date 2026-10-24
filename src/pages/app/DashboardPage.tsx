import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  FiAlertCircle,
  FiArrowRight,
  FiAward,
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClipboard,
  FiFileText,
  FiTarget,
  FiTrendingUp,
  FiUsers,
} from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader, StatCard } from '@/components/ui/Feedback';
import { ROLE_LABELS } from '@/config/permissions';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import type {
  Evaluation,
  FinalEvaluation,
  ImprovementPlan,
  Note,
  Presence,
  Stagiaire,
} from '@/types/domain';
import {
  average,
  formatDate,
  formatTime,
  fullName,
  percentage,
  todayISO,
} from '@/utils/format';

export default function DashboardPage() {
  const { user, can } = useAuth();
  const { data, loading: referenceLoading } = useReferenceData();

  const stagiaire = data.stagiaires.find(
    (item) => item.id === user?.stagiaire_id || item.email === user?.email,
  );
  const isStagiaire = user?.role === 'stagiaire';

  const { rows: allNotes } = useForgeTable<Note>('notes', { limit: 500 });
  const { rows: allPresences } = useForgeTable<Presence>('presences', { limit: 500 });
  const { rows: plans } = useForgeTable<ImprovementPlan>('improvement_plans', {
    filters: { status: 'en_cours' },
    limit: 500,
  });
  const { rows: finals } = useForgeTable<FinalEvaluation>('final_evaluations', {
    limit: 500,
    order: 'created_at.desc',
  });

  const ownNotes = useMemo(
    () => (stagiaire ? allNotes.filter((note) => note.stagiaire_id === stagiaire.id) : []),
    [allNotes, stagiaire],
  );
  const ownPresences = useMemo(
    () => (stagiaire ? allPresences.filter((presence) => presence.stagiaire_id === stagiaire.id) : []),
    [allPresences, stagiaire],
  );

  const upcomingSeances = useMemo(() => {
    const today = todayISO();
    return data.seances
      .filter((seance) => seance.date >= today && seance.status !== 'annulee')
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(0, 5);
  }, [data.seances]);

  const upcomingEvaluations = useMemo(() => {
    const today = todayISO();
    return data.evaluations
      .filter((evaluation) => evaluation.date && evaluation.date >= today)
      .sort((left, right) => (left.date ?? '').localeCompare(right.date ?? ''))
      .slice(0, 5);
  }, [data.evaluations]);

  const staffStats = useMemo(() => {
    const activeStagiaires = data.stagiaires.filter((item) => item.statut === 'actif').length;
    const normalized = allNotes
      .filter((note) => note.score !== null && note.score !== undefined)
      .map((note) => ((note.score ?? 0) / (note.max_score || 20)) * 20);
    const present = allPresences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    const validated = finals.filter((item) => item.decision === 'valide').length;

    return {
      activeStagiaires,
      globalAverage: average(normalized),
      attendanceRate: percentage(present, Math.max(allPresences.length, 1)),
      validated,
      successRate: percentage(validated, Math.max(finals.length, 1)),
    };
  }, [data.stagiaires, allNotes, allPresences, finals]);

  const ownStats = useMemo(() => {
    const normalized = ownNotes
      .filter((note) => note.score !== null && note.score !== undefined)
      .map((note) => ((note.score ?? 0) / (note.max_score || 20)) * 20);
    const present = ownPresences.filter((presence) =>
      ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
    ).length;
    const final = finals.find((item) => item.stagiaire_id === stagiaire?.id);
    return {
      average: average(normalized),
      notesCount: normalized.length,
      attendanceRate: percentage(present, Math.max(ownPresences.length, 1)),
      finalAverage: final?.final_average ?? null,
      decision: final?.decision ?? null,
    };
  }, [ownNotes, ownPresences, finals, stagiaire]);

  const atRisk = useMemo(() => {
    const minAverage = 10;
    return data.stagiaires
      .filter((item) => item.statut === 'actif')
      .map((item) => {
        const notes = allNotes
          .filter((note) => note.stagiaire_id === item.id && note.score !== null)
          .map((note) => ((note.score ?? 0) / (note.max_score || 20)) * 20);
        const presences = allPresences.filter((presence) => presence.stagiaire_id === item.id);
        const present = presences.filter((presence) =>
          ['present', 'retard', 'sortie_autorisee'].includes(presence.status),
        ).length;
        return {
          id: item.id,
          stagiaire: item,
          average: average(notes),
          attendance: percentage(present, Math.max(presences.length, 1)),
          hasData: notes.length > 0 || presences.length > 0,
        };
      })
      .filter(
        (item) => item.hasData && (item.average < minAverage || item.attendance < 80),
      )
      .sort((left, right) => left.average - right.average)
      .slice(0, 6);
  }, [data.stagiaires, allNotes, allPresences]);

  const recentStagiaires = useMemo(
    () =>
      [...data.stagiaires]
        .sort((left, right) => (right.created_at ?? '').localeCompare(left.created_at ?? ''))
        .slice(0, 6),
    [data.stagiaires],
  );

  const quickLinks = [
    { label: 'Nouveau stagiaire', path: '/app/stagiaires', icon: FiUsers, permission: 'stagiaires' },
    { label: 'Saisir les notes', path: '/app/notes', icon: FiClipboard, permission: 'notes' },
    { label: 'Présences', path: '/app/presences', icon: FiCheckCircle, permission: 'presences' },
    { label: 'Bulletins', path: '/app/bulletins', icon: FiFileText, permission: 'bulletins' },
    { label: 'Progression', path: '/app/progression', icon: FiTrendingUp, permission: 'progression' },
    { label: 'Rapports', path: '/app/rapports', icon: FiBarChart2, permission: 'reports' },
  ].filter((item) => can(item.permission));

  const stagiaireColumns: TableColumn<Stagiaire>[] = [
    {
      key: 'name',
      header: 'Stagiaire',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{fullName(row)}</p>
          <p className="text-xs text-body dark:text-body-dark">{row.matricule}</p>
        </div>
      ),
    },
    { key: 'domaine', header: 'Domaine', hideBelow: 'md', render: (row) => row.domaine ?? '—' },
    { key: 'created', header: 'Inscrit le', hideBelow: 'lg', render: (row) => formatDate(row.created_at) },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => <Badge tone={statusTone(row.statut)}>{row.statut}</Badge>,
    },
  ];

  const evaluationColumns: TableColumn<Evaluation>[] = [
    {
      key: 'title',
      header: 'Évaluation',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{row.title}</p>
          <p className="text-xs text-body dark:text-body-dark">
            {data.modules.find((module) => module.id === row.module_id)?.name ?? '—'}
          </p>
        </div>
      ),
    },
    { key: 'date', header: 'Date', render: (row) => formatDate(row.date) },
    {
      key: 'status',
      header: 'Statut',
      render: (row) => <Badge tone={statusTone(row.status)}>{row.status.replace('_', ' ')}</Badge>,
    },
  ];

  const riskColumns: TableColumn<(typeof atRisk)[number]>[] = [
    {
      key: 'stagiaire',
      header: 'Stagiaire',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{fullName(row.stagiaire)}</p>
          <p className="text-xs text-body dark:text-body-dark">{row.stagiaire.matricule}</p>
        </div>
      ),
    },
    {
      key: 'average',
      header: 'Moyenne',
      render: (row) => (
        <Badge tone={row.average < 10 ? 'danger' : 'warning'}>{row.average.toFixed(2)}/20</Badge>
      ),
    },
    {
      key: 'attendance',
      header: 'Présence',
      render: (row) => (
        <Badge tone={row.attendance < 80 ? 'warning' : 'success'}>{row.attendance}%</Badge>
      ),
    },
    {
      key: 'action',
      header: '',
      align: 'right',
      render: (row) => (
        <Link to={`/app/stagiaires/${row.stagiaire.id}`} className="text-xs font-semibold text-primary hover:underline">
          Voir le dossier
        </Link>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Tableau de bord"
        title={`Bonjour, ${fullName(user)}`}
        description={
          user
            ? `Vous êtes connecté en tant que ${ROLE_LABELS[user.role]}. Voici la synthèse de votre espace.`
            : undefined
        }
        actions={
          isStagiaire && stagiaire ? (
            <Link to={`/app/stagiaires/${stagiaire.id}`} className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white">
              Mon dossier complet <FiArrowRight className="h-4 w-4" />
            </Link>
          ) : undefined
        }
      />

      {referenceLoading && (
        <p className="mb-4 text-xs text-body dark:text-body-dark">Synchronisation des référentiels…</p>
      )}

      {isStagiaire ? (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Moyenne" value={`${ownStats.average.toFixed(2)}/20`} tone={ownStats.average >= 10 ? 'success' : 'danger'} icon={<FiTrendingUp className="h-4 w-4" />} />
            <StatCard label="Notes saisies" value={ownStats.notesCount} tone="primary" icon={<FiClipboard className="h-4 w-4" />} />
            <StatCard label="Présence" value={`${ownStats.attendanceRate}%`} tone={ownStats.attendanceRate >= 80 ? 'success' : 'warning'} icon={<FiCheckCircle className="h-4 w-4" />} />
            <StatCard label="Moyenne finale" value={ownStats.finalAverage !== null ? `${ownStats.finalAverage}/20` : '—'} tone="purple" icon={<FiAward className="h-4 w-4" />} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card-root border border-stroke dark:border-white/10">
              <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
                <h2 className="text-sm font-bold text-black dark:text-white">Prochaines séances</h2>
              </div>
              {upcomingSeances.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">Aucune séance planifiée.</p>
              ) : (
                <div className="divide-y divide-stroke dark:divide-white/5">
                  {upcomingSeances.map((seance) => (
                    <div key={seance.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                        <FiCalendar className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-black dark:text-white">
                          {seance.title ?? data.modules.find((module) => module.id === seance.module_id)?.name ?? 'Séance'}
                        </p>
                        <p className="text-xs text-body dark:text-body-dark">
                          {formatDate(seance.date)} · {formatTime(seance.start_time)} · {seance.room ?? 'Salle à confirmer'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-root border border-stroke dark:border-white/10">
              <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
                <h2 className="text-sm font-bold text-black dark:text-white">Prochaines évaluations</h2>
              </div>
              {upcomingEvaluations.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-body dark:text-body-dark">Aucune évaluation programmée.</p>
              ) : (
                <div className="divide-y divide-stroke dark:divide-white/5">
                  {upcomingEvaluations.map((evaluation) => (
                    <div key={evaluation.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="flex h-10 w-10 items-center justify-center bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
                        <FiBookOpen className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-black dark:text-white">{evaluation.title}</p>
                        <p className="text-xs text-body dark:text-body-dark">
                          {formatDate(evaluation.date)} · coefficient {evaluation.coefficient}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Stagiaires actifs" value={staffStats.activeStagiaires} hint={`${data.stagiaires.length} dossiers`} tone="primary" icon={<FiUsers className="h-4 w-4" />} />
            <StatCard label="Moyenne globale" value={`${staffStats.globalAverage.toFixed(2)}/20`} tone={staffStats.globalAverage >= 10 ? 'success' : 'danger'} icon={<FiTrendingUp className="h-4 w-4" />} />
            <StatCard label="Taux de présence" value={`${staffStats.attendanceRate}%`} tone={staffStats.attendanceRate >= 80 ? 'success' : 'warning'} icon={<FiCheckCircle className="h-4 w-4" />} />
            <StatCard label="Taux de réussite" value={`${staffStats.successRate}%`} hint={`${staffStats.validated} validé(s)`} tone="purple" icon={<FiAward className="h-4 w-4" />} />
          </div>

          <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="card-root border border-stroke p-5 dark:border-white/10">
              <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Accès rapides</h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {quickLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="flex items-center gap-3 border border-stroke px-3 py-3 text-xs font-semibold text-dark transition-colors hover:border-primary hover:text-primary dark:border-white/10 dark:text-white"
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="card-root border border-stroke p-5 dark:border-white/10">
              <h2 className="mb-4 text-sm font-bold text-black dark:text-white">Alertes & priorités</h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-body dark:text-body-dark">
                    <FiTarget className="h-4 w-4 text-amber-500" /> Plans en cours
                  </span>
                  <strong className="text-dark dark:text-white">{plans.length}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-body dark:text-body-dark">
                    <FiAlertCircle className="h-4 w-4 text-rose-500" /> Stagiaires à risque
                  </span>
                  <strong className="text-dark dark:text-white">{atRisk.length}</strong>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-body dark:text-body-dark">
                    <FiClipboard className="h-4 w-4 text-primary" /> Évaluations finales
                  </span>
                  <strong className="text-dark dark:text-white">{finals.length}</strong>
                </div>
              </div>
            </div>
          </div>

          {atRisk.length > 0 && (
            <div className="mb-5 card-root border border-stroke dark:border-white/10">
              <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-white/10">
                <h2 className="text-sm font-bold text-black dark:text-white">Stagiaires nécessitant une attention</h2>
                <Badge tone="warning">{atRisk.length}</Badge>
              </div>
              <DataTable columns={riskColumns} rows={atRisk} />
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="card-root border border-stroke dark:border-white/10">
              <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-white/10">
                <h2 className="text-sm font-bold text-black dark:text-white">Derniers stagiaires</h2>
                <Link to="/app/stagiaires" className="text-xs font-semibold text-primary hover:underline">
                  Tout voir
                </Link>
              </div>
              <DataTable
                columns={stagiaireColumns}
                rows={recentStagiaires}
                emptyTitle="Aucun stagiaire"
                emptyDescription="Créez un premier dossier stagiaire."
              />
            </div>

            <div className="card-root border border-stroke dark:border-white/10">
              <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-white/10">
                <h2 className="text-sm font-bold text-black dark:text-white">Évaluations à venir</h2>
                <Link to="/app/evaluations" className="text-xs font-semibold text-primary hover:underline">
                  Tout voir
                </Link>
              </div>
              <DataTable
                columns={evaluationColumns}
                rows={upcomingEvaluations}
                emptyTitle="Aucune évaluation programmée"
                emptyDescription="Planifiez les prochaines évaluations."
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
