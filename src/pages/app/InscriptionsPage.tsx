import { useMemo, useState } from 'react';
import { FiCopy, FiMail } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EntityManager } from '@/components/ui/EntityManager';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { createInscriptionWithAccount, type StagiaireAccount } from '@/services/inscription.service';
import type { Inscription, Stagiaire } from '@/types/domain';
import { notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, fullName } from '@/utils/format';
import { buildOptions } from '@/utils/options';

const statusOptions = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'validee', label: 'Validée' },
  { value: 'annulee', label: 'Annulée' },
  { value: 'terminee', label: 'Terminée' },
];

type CredentialsState = {
  stagiaire: Stagiaire;
  account: StagiaireAccount;
  formation: string;
  promotion: string;
};

function buildCredentialsMessage(credentials: CredentialsState, loginUrl: string): string {
  const { stagiaire, account } = credentials;
  const lines = [
    `Bonjour ${stagiaire.prenom},`,
    '',
    'Votre inscription à StageBuild a bien été enregistrée.',
    '',
    'Informations de connexion :',
    `Email : ${account.email}`,
  ];

  if (account.temporaryPassword) {
    lines.push(`Mot de passe temporaire : ${account.temporaryPassword}`);
  }

  lines.push(
    `Lien de connexion : ${loginUrl}`,
    '',
    account.temporaryPassword
      ? 'Pour votre sécurité, modifiez votre mot de passe après votre première connexion.'
      : 'Votre compte existait déjà. Utilisez votre mot de passe habituel.',
    '',
    'Cordialement,',
    'StageBuild',
  );

  return lines.join('\n');
}

export default function InscriptionsPage() {
  const { user } = useAuth();
  const { data, refresh } = useReferenceData();
  const [credentials, setCredentials] = useState<CredentialsState | null>(null);

  const stagiaireOptions = useMemo(
    () => buildOptions(data.stagiaires, (stagiaire) => `${fullName(stagiaire)} (${stagiaire.matricule})`),
    [data.stagiaires],
  );
  const formationOptions = useMemo(
    () => buildOptions(data.formations, (formation) => formation.name),
    [data.formations],
  );
  const promotionOptions = useMemo(
    () => buildOptions(data.promotions, (promotion) => promotion.code),
    [data.promotions],
  );

  const loginUrl = `${window.location.origin}/login`;
  const credentialsMessage = credentials ? buildCredentialsMessage(credentials, loginUrl) : '';
  const mailtoUrl = credentials
    ? `mailto:${credentials.account.email}?subject=${encodeURIComponent(
        'Vos informations de connexion StageBuild',
      )}&body=${encodeURIComponent(credentialsMessage)}`
    : '';

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess(`${label} copié`);
    } catch {
      notifyError('Copie impossible', 'Sélectionnez le texte manuellement.');
    }
  }

  async function handleCreate(
    values: Record<string, string | boolean>,
  ): Promise<Inscription | null> {
    const stagiaireId = typeof values.stagiaire_id === 'string' ? values.stagiaire_id : '';
    const formationId = typeof values.formation_id === 'string' ? values.formation_id : '';
    const promotionId = typeof values.promotion_id === 'string' ? values.promotion_id : '';
    const stagiaire = data.stagiaires.find((item) => item.id === stagiaireId);
    const formation = data.formations.find((item) => item.id === formationId);
    const promotion = data.promotions.find((item) => item.id === promotionId);

    if (!stagiaire) {
      throw new Error('Sélectionnez un stagiaire.');
    }

    if (!formation) {
      throw new Error('Sélectionnez une formation.');
    }

    const result = await createInscriptionWithAccount({
      stagiaire,
      formationId,
      promotionId: promotion?.id ?? null,
      startDate: typeof values.start_date === 'string' ? values.start_date || null : null,
      endDate: typeof values.end_date === 'string' ? values.end_date || null : null,
      status: (typeof values.status === 'string' && values.status
        ? values.status
        : 'en_attente') as Inscription['status'],
      responsibleId: user?.id ?? null,
    });

    setCredentials({
      stagiaire,
      account: result.account,
      formation: formation.name,
      promotion: promotion?.code ?? '—',
    });
    await refresh();

    return result.inscription;
  }

  return (
    <>
      <EntityManager<Inscription>
        table="inscriptions"
        eyebrow="Dossiers"
        title="Inscriptions"
        description="Inscrivez les stagiaires aux formations et suivez la validité de chaque dossier."
        createLabel="Nouvelle inscription"
        rowLabel={(row) => {
          const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
          return stagiaire ? fullName(stagiaire) : 'Inscription';
        }}
        searchPlaceholder="Rechercher un stagiaire, une formation…"
        searchFields={(row) => {
          const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
          const formation = data.formations.find((item) => item.id === row.formation_id);
          return [fullName(stagiaire), stagiaire?.matricule, formation?.name, row.status]
            .filter(Boolean)
            .join(' ');
        }}
        onCreateOverride={handleCreate}
        columns={[
          {
            key: 'stagiaire',
            header: 'Stagiaire',
            render: (row) => {
              const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
              return (
                <div>
                  <p className="font-semibold text-black dark:text-white">{fullName(stagiaire)}</p>
                  <p className="text-xs text-body dark:text-body-dark">{stagiaire?.matricule ?? '—'}</p>
                </div>
              );
            },
          },
          {
            key: 'formation',
            header: 'Formation',
            render: (row) => (
              <div>
                <p>{data.formations.find((item) => item.id === row.formation_id)?.name ?? '—'}</p>
                <p className="text-xs text-body dark:text-body-dark">
                  {data.promotions.find((item) => item.id === row.promotion_id)?.code ?? '—'}
                </p>
              </div>
            ),
          },
          {
            key: 'period',
            header: 'Période',
            hideBelow: 'md',
            render: (row) => `${formatDate(row.start_date)} → ${formatDate(row.end_date)}`,
          },
          {
            key: 'status',
            header: 'Statut',
            render: (row) => (
              <Badge tone={statusTone(row.status)}>
                {statusOptions.find((option) => option.value === row.status)?.label ?? row.status}
              </Badge>
            ),
          },
        ]}
        fields={[
          { name: 'stagiaire_id', label: 'Stagiaire', type: 'select', options: stagiaireOptions, required: true },
          { name: 'formation_id', label: 'Formation', type: 'select', options: formationOptions, required: true },
          { name: 'promotion_id', label: 'Promotion', type: 'select', options: promotionOptions },
          { name: 'start_date', label: 'Début', type: 'date' },
          { name: 'end_date', label: 'Fin', type: 'date' },
          { name: 'status', label: 'Statut', type: 'select', options: statusOptions, required: true, defaultValue: 'en_attente' },
        ]}
      />

      <Modal
        open={Boolean(credentials)}
        onClose={() => setCredentials(null)}
        title={credentials?.account.existingAccount ? 'Compte stagiaire existant' : 'Compte stagiaire créé'}
        description={
          credentials
            ? `${fullName(credentials.stagiaire)} · ${credentials.formation} · ${credentials.promotion}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setCredentials(null)}>
              Fermer
            </Button>
            <Button
              variant="outline"
              icon={<FiCopy className="h-4 w-4" />}
              onClick={() => void copyText('Identifiants', credentialsMessage)}
            >
              Copier les identifiants
            </Button>
            <Button
              icon={<FiMail className="h-4 w-4" />}
              onClick={() => {
                window.location.href = mailtoUrl;
              }}
            >
              Envoyer par email
            </Button>
          </>
        }
      >
        {credentials && (
          <div className="space-y-5">
            <div className="border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                Inscription enregistrée
              </p>
              <p className="mt-1 text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                {fullName(credentials.stagiaire)}
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                {credentials.formation} · {credentials.promotion}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Email de connexion
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {credentials.account.email}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiCopy className="h-3.5 w-3.5" />}
                    onClick={() => void copyText('Email', credentials.account.email)}
                  >
                    Copier
                  </Button>
                </div>
              </div>

              {credentials.account.temporaryPassword && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                    Mot de passe temporaire
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                      {credentials.account.temporaryPassword}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FiCopy className="h-3.5 w-3.5" />}
                      onClick={() =>
                        void copyText(
                          'Mot de passe',
                          credentials.account.temporaryPassword as string,
                        )
                      }
                    >
                      Copier
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {!credentials.account.temporaryPassword && (
              <div className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                Un compte stagiaire existe déjà pour cet email. Aucun mot de passe temporaire n’a
                été généré. Le stagiaire doit utiliser son mot de passe existant.
              </div>
            )}

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                Lien de connexion
              </p>
              <code className="mt-1 block break-all border border-stroke bg-gray2 px-3 py-2 text-sm text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                {loginUrl}
              </code>
            </div>

            <p className="text-xs text-body dark:text-body-dark">
              Le bouton « Envoyer par email » ouvre votre messagerie avec les identifiants
              préremplis. Vérifiez le destinataire avant l’envoi.
            </p>
          </div>
        )}
      </Modal>
    </>
  );
}
