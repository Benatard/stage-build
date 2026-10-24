import { useMemo, useState } from 'react';
import { FiFileText, FiPrinter, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { DataTable, type TableColumn } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Form';
import { DOCUMENT_TYPE_OPTIONS, optionLabel } from '@/config/options';
import { useAuth } from '@/context/AuthContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { useReferenceData } from '@/hooks/useReferenceData';
import { dataService } from '@/services/data.service';
import type { DocumentRecord, FinalEvaluation, Note } from '@/types/domain';
import { confirmDelete, notifyError, notifySuccess } from '@/utils/alerts';
import { average, formatDate, fullName, round } from '@/utils/format';
import { buildOptions } from '@/utils/options';

export default function DocumentsPage() {
  const { data } = useReferenceData();
  const { user } = useAuth();
  const [stagiaireId, setStagiaireId] = useState(user?.stagiaire_id ?? '');
  const [type, setType] = useState('attestation_stage');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const enabled = Boolean(stagiaireId);
  const stagiaire = data.stagiaires.find((item) => item.id === stagiaireId);

  const { rows: notes } = useForgeTable<Note>('notes', { filters: { stagiaire_id: stagiaireId }, enabled });
  const { rows: finals } = useForgeTable<FinalEvaluation>('final_evaluations', {
    filters: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled,
  });
  const { rows: documents, loading, reload } = useForgeTable<DocumentRecord>('documents', {
    filters: { stagiaire_id: stagiaireId },
    order: 'created_at.desc',
    enabled,
  });

  const final = finals[0];

  const moduleStats = useMemo(() => {
    const groups = new Map<string, { name: string; values: number[] }>();
    notes.forEach((note) => {
      if (note.score === null || note.score === undefined) return;
      const evaluation = data.evaluations.find((item) => item.id === note.evaluation_id);
      const module = data.modules.find((item) => item.id === evaluation?.module_id);
      const key = module?.id ?? 'sans-module';
      const current = groups.get(key) ?? { name: module?.name ?? 'Sans module', values: [] };
      current.values.push(round((note.score / (note.max_score || 20)) * 20, 2));
      groups.set(key, current);
    });
    return Array.from(groups.values()).map((group) => ({
      name: group.name,
      average: average(group.values),
    }));
  }, [notes, data.evaluations, data.modules]);

  function defaultTitle(documentType: string): string {
    return optionLabel(DOCUMENT_TYPE_OPTIONS, documentType);
  }

  async function generate() {
    if (!stagiaire) {
      notifyError('Sélectionnez un stagiaire');
      return;
    }

    setSaving(true);
    const documentTitle = title.trim() || defaultTitle(type);

    const content = {
      organization: { name: 'FLASH EMPIRE', address: 'Kolwezi, Province du Lualaba, RDC' },
      stagiaire: {
        matricule: stagiaire.matricule,
        nom: fullName(stagiaire),
        sexe: stagiaire.sexe,
        date_naissance: stagiaire.date_naissance,
        lieu_naissance: stagiaire.lieu_naissance,
        domaine: stagiaire.domaine,
        specialite: stagiaire.specialite,
        etablissement_origine: stagiaire.etablissement_origine,
        niveau_etudes: stagiaire.niveau_etudes,
      },
      final: final
        ? {
            final_average: final.final_average,
            decision: final.decision,
            appreciation: final.appreciation,
            modules_average: final.modules_average,
            qcm_average: final.qcm_average,
            tp_average: final.tp_average,
            project_average: final.project_average,
            attendance_rate: final.attendance_rate,
          }
        : null,
      modules: moduleStats,
      generated_at: new Date().toISOString(),
    };

    try {
      await dataService.createRow<DocumentRecord>('documents', {
        stagiaire_id: stagiaire.id,
        type,
        title: documentTitle,
        content,
        generated_by: user?.id ?? null,
      });
      notifySuccess('Document généré');
      setTitle('');
      reload();
    } catch {
      notifyError('Génération impossible');
    } finally {
      setSaving(false);
    }
  }

  async function remove(document: DocumentRecord) {
    const confirmed = await confirmDelete(document.title);
    if (!confirmed) return;
    try {
      await dataService.deleteRow('documents', document.id);
      notifySuccess('Document supprimé');
      reload();
    } catch {
      notifyError('Suppression impossible');
    }
  }

  const columns: TableColumn<DocumentRecord>[] = [
    {
      key: 'title',
      header: 'Document',
      render: (row) => (
        <div>
          <p className="font-semibold text-black dark:text-white">{row.title}</p>
          <p className="text-xs text-body dark:text-body-dark">
            {optionLabel(DOCUMENT_TYPE_OPTIONS, row.type)}
          </p>
        </div>
      ),
    },
    { key: 'date', header: 'Généré le', hideBelow: 'md', render: (row) => formatDate(row.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <button
          type="button"
          onClick={() => void remove(row)}
          className="flex h-8 w-8 items-center justify-center text-body hover:bg-rose-50 hover:text-rose-600 dark:text-body-dark"
          title="Supprimer"
        >
          <FiTrash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const isCertificate = ['attestation_stage', 'certificat_formation', 'certificat_reussite'].includes(type);
  const isCard = type === 'carte_stagiaire';

  return (
    <div>
      <PageHeader
        eyebrow="Résultats"
        title="Documents officiels"
        description="Générez les attestations, certificats, fiches et relevés de notes imprimables."
        actions={
          <>
            <Button
              onClick={() => void generate()}
              loading={saving}
              disabled={!stagiaireId}
              icon={<FiFileText className="h-4 w-4" />}
            >
              Générer le document
            </Button>
            <Button
              variant="outline"
              onClick={() => window.print()}
              disabled={!stagiaireId}
              icon={<FiPrinter className="h-4 w-4" />}
            >
              Imprimer
            </Button>
          </>
        }
      />

      <div className="mb-5 card-root grid gap-4 border border-stroke p-5 dark:border-white/10 sm:grid-cols-3">
        <Field label="Stagiaire" required>
          <Select
            value={stagiaireId}
            placeholder="Sélectionner…"
            options={buildOptions(data.stagiaires, (item) => `${fullName(item)} (${item.matricule})`)}
            onChange={(event) => setStagiaireId(event.target.value)}
          />
        </Field>
        <Field label="Type de document" required>
          <Select
            value={type}
            options={DOCUMENT_TYPE_OPTIONS}
            onChange={(event) => setType(event.target.value)}
          />
        </Field>
        <Field label="Titre personnalisé" hint="Laissez vide pour utiliser le libellé par défaut.">
          <Input value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
      </div>

      {stagiaire && (
        <div id="print-area" className="mb-6 border border-stroke bg-white p-10 text-black dark:border-white/10">
          <div className="flex items-start justify-between border-b-2 border-black pb-4">
            <div>
              <p className="text-lg font-extrabold tracking-tight">FLASH EMPIRE</p>
              <p className="text-xs">Kolwezi, Province du Lualaba, RDC</p>
            </div>
            <p className="text-xs">Stage Build</p>
          </div>

          {isCard ? (
            <div className="mx-auto mt-10 w-[420px] border-2 border-black p-6">
              <p className="text-center text-sm font-bold uppercase tracking-widest">Carte stagiaire</p>
              <div className="mt-5 flex items-center gap-4">
                <div className="flex h-24 w-20 items-center justify-center border border-black text-xs text-center">
                  Photo
                </div>
                <div className="text-sm">
                  <p className="text-base font-bold">{fullName(stagiaire)}</p>
                  <p>Matricule : {stagiaire.matricule}</p>
                  <p>Domaine : {stagiaire.domaine ?? '—'}</p>
                  <p>Spécialité : {stagiaire.specialite ?? '—'}</p>
                </div>
              </div>
              <p className="mt-5 text-center text-[10px]">
                Valable pour l’année {new Date().getFullYear()} — Stage Build / FLASH EMPIRE
              </p>
            </div>
          ) : (
            <>
              <h1 className="mt-8 text-center text-2xl font-bold uppercase tracking-wide">
                {title.trim() || defaultTitle(type)}
              </h1>

              <p className="mt-8 text-sm leading-relaxed">
                Nous, FLASH EMPIRE, attestons que{' '}
                <strong>{fullName(stagiaire)}</strong>, matricule <strong>{stagiaire.matricule}</strong>,
                {stagiaire.domaine ? ` du domaine de ${stagiaire.domaine}` : ''}
                {stagiaire.specialite ? `, spécialité ${stagiaire.specialite}` : ''}, a effectué un stage
                au sein de notre organisation dans le cadre du programme Stage Build.
              </p>

              {isCertificate && final && (
                <p className="mt-4 text-sm leading-relaxed">
                  À l’issue de la formation, la moyenne finale pondérée s’élève à{' '}
                  <strong>{final.final_average ?? 0}/20</strong> et la décision du jury est{' '}
                  <strong>
                    {final.decision === 'valide'
                      ? 'VALIDÉ'
                      : final.decision === 'non_valide'
                        ? 'NON VALIDÉ'
                        : 'EN ATTENTE'}
                  </strong>.
                </p>
              )}

              {type === 'releve_notes' && (
                <table className="mt-6 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-black">
                      <th className="py-2 text-left">Module</th>
                      <th className="py-2 text-right">Moyenne /20</th>
                    </tr>
                  </thead>
                  <tbody>
                    {moduleStats.map((module) => (
                      <tr key={module.name} className="border-b border-slate-300">
                        <td className="py-2">{module.name}</td>
                        <td className="py-2 text-right">{module.average.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {type === 'fiche_stagiaire' && (
                <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
                  <p>Date de naissance : {formatDate(stagiaire.date_naissance)}</p>
                  <p>Lieu de naissance : {stagiaire.lieu_naissance ?? '—'}</p>
                  <p>Établissement : {stagiaire.etablissement_origine ?? '—'}</p>
                  <p>Niveau d’études : {stagiaire.niveau_etudes ?? '—'}</p>
                  <p>Téléphone : {stagiaire.telephone ?? '—'}</p>
                  <p>Email : {stagiaire.email ?? '—'}</p>
                </div>
              )}

              {type === 'fiche_evaluation_finale' && final && (
                <div className="mt-6 space-y-1 text-sm">
                  <p>Moyenne modules : {final.modules_average ?? 0}/20</p>
                  <p>QCM : {final.qcm_average ?? 0}/20</p>
                  <p>Travaux pratiques : {final.tp_average ?? 0}/20</p>
                  <p>Projet final : {final.project_average ?? 0}/20</p>
                  <p>Présence : {final.attendance_rate ?? 0}%</p>
                  <p className="mt-3 font-bold">Moyenne finale : {final.final_average ?? 0}/20</p>
                  <p>Appréciation : {final.appreciation ?? '—'}</p>
                </div>
              )}

              <div className="mt-12 flex justify-between text-xs">
                <p>Fait à Kolwezi, le {formatDate(new Date().toISOString())}</p>
                <div className="text-right">
                  <p>La Direction</p>
                  <p className="mt-10 border-t border-black pt-2">Signature et cachet</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {stagiaireId && (
        <div className="card-root border border-stroke dark:border-white/10">
          <div className="border-b border-stroke px-5 py-4 dark:border-white/10">
            <h2 className="text-sm font-bold text-black dark:text-white">Documents générés</h2>
          </div>
          <DataTable
            columns={columns}
            rows={documents}
            loading={loading}
            onRetry={reload}
            emptyTitle="Aucun document"
            emptyDescription="Générez un premier document pour ce stagiaire."
          />
        </div>
      )}
    </div>
  );
}
