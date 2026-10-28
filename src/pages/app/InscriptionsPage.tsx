import { useMemo, useState } from 'react';
import { FiCopy, FiEdit2, FiEye, FiMail, FiRefreshCw } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EntityManager } from '@/components/ui/EntityManager';
import { Field, Input } from '@/components/ui/Form';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import {
  createInscriptionWithAccount,
  generateTemporaryPassword,
  updateStagiairePassword,
  type StagiaireAccount,
} from '@/services/inscription.service';
import { getRememberedPassword, rememberPassword } from '@/services/password-vault';
import type { Inscription, Stagiaire, User } from '@/types/domain';
import { notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, fullName, getErrorMessage } from '@/utils/format';
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

type AccountViewState = {
  stagiaire: Stagiaire;
  account: User;
  formation: string;
  promotion: string;
  temporaryPassword?: string;
};

type CredentialsMessageInput = {
  stagiaire: Stagiaire;
  email: string;
  phone?: string | null;
  temporaryPassword?: string;
  existingAccount?: boolean;
  loginUrl: string;
};

function buildCredentialsMessage({
  stagiaire,
  email,
  phone,
  temporaryPassword,
  existingAccount,
  loginUrl,
}: CredentialsMessageInput): string {
  const lines = [
    `Bonjour ${stagiaire.prenom},`,
    '',
    'Vos informations de connexion StageBuild :',
    `Email : ${email}`,
  ];

  if (phone) lines.push(`Téléphone : ${phone}`);
  if (temporaryPassword) lines.push(`Mot de passe temporaire : ${temporaryPassword}`);

  lines.push(
    `Lien de connexion : ${loginUrl}`,
    '',
    temporaryPassword
      ? 'Pour votre sécurité, modifiez votre mot de passe après votre première connexion.'
      : existingAccount
        ? 'Votre compte existait déjà. Utilisez votre mot de passe habituel.'
        : 'Contactez l’administration si vous avez besoin de votre mot de passe.',
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
  const [accountView, setAccountView] = useState<AccountViewState | null>(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  function findAccount(stagiaireId: string): User | undefined {
    return data.users.find(
      (item) => item.role === 'stagiaire' && item.stagiaire_id === stagiaireId,
    );
  }

  function openAccountView(
    stagiaire: Stagiaire,
    account: User,
    formation: string,
    promotion: string,
  ) {
    setAccountView({
      stagiaire,
      account,
      formation,
      promotion,
      temporaryPassword: getRememberedPassword(user?.id, account.id),
    });
    setPasswordDraft('');
    setPasswordConfirm('');
    setPasswordError(null);
    setPasswordFormOpen(false);
  }

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
  const credentialsMessage = credentials
    ? buildCredentialsMessage({
        stagiaire: credentials.stagiaire,
        email: credentials.account.email,
        phone: credentials.account.phone ?? credentials.stagiaire.telephone,
        temporaryPassword: credentials.account.temporaryPassword,
        existingAccount: credentials.account.existingAccount,
        loginUrl,
      })
    : '';
  const mailtoUrl = credentials
    ? `mailto:${credentials.account.email}?subject=${encodeURIComponent(
        'Vos informations de connexion StageBuild',
      )}&body=${encodeURIComponent(credentialsMessage)}`
    : '';
  const accountMessage = accountView
    ? buildCredentialsMessage({
        stagiaire: accountView.stagiaire,
        email: accountView.account.email,
        phone: accountView.account.phone ?? accountView.stagiaire.telephone,
        temporaryPassword: accountView.temporaryPassword,
        existingAccount: true,
        loginUrl,
      })
    : '';
  const accountMailtoUrl = accountView
    ? `mailto:${accountView.account.email}?subject=${encodeURIComponent(
        'Vos informations de connexion StageBuild',
      )}&body=${encodeURIComponent(accountMessage)}`
    : '';

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      notifySuccess(`${label} copié`);
    } catch {
      notifyError('Copie impossible', 'Sélectionnez le texte manuellement.');
    }
  }

  async function handleGeneratePassword() {
    if (!accountView) return;

    setSavingPassword(true);
    setPasswordError(null);

    try {
      const generated = generateTemporaryPassword();
      const targetUserId = accountView.account.id;
      await updateStagiairePassword(targetUserId, generated);
      rememberPassword(user?.id, targetUserId, generated);
      setAccountView((current) =>
        current && current.account.id === targetUserId
          ? { ...current, temporaryPassword: generated }
          : current,
      );
      setPasswordDraft(generated);
      setPasswordConfirm(generated);
      notifySuccess('Mot de passe temporaire généré');
    } catch (error) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accountView) return;

    const password = passwordDraft.trim();
    const confirmation = passwordConfirm.trim();

    if (password.length < 6) {
      setPasswordError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    if (password !== confirmation) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setSavingPassword(true);
    setPasswordError(null);

    try {
      const targetUserId = accountView.account.id;
      await updateStagiairePassword(targetUserId, password);
      rememberPassword(user?.id, targetUserId, password);
      setAccountView((current) =>
        current && current.account.id === targetUserId
          ? { ...current, temporaryPassword: password }
          : current,
      );
      setPasswordFormOpen(false);
      setPasswordDraft('');
      setPasswordConfirm('');
      notifySuccess('Mot de passe modifié');
    } catch (error) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setSavingPassword(false);
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

    if (result.account.temporaryPassword) {
      rememberPassword(user?.id, result.account.userId, result.account.temporaryPassword);
    }

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
            key: 'account',
            header: 'Compte stagiaire',
            render: (row) => {
              const stagiaire = data.stagiaires.find((item) => item.id === row.stagiaire_id);
              const account = findAccount(row.stagiaire_id);

              if (!account) {
                return <span className="text-xs text-body dark:text-body-dark">Non créé</span>;
              }

              const formation = data.formations.find((item) => item.id === row.formation_id);
              const promotion = data.promotions.find((item) => item.id === row.promotion_id);

              return (
                <div>
                  <p className="break-all text-xs text-body dark:text-body-dark">{account.email}</p>
                  <button
                    type="button"
                    onClick={() =>
                      stagiaire &&
                      openAccountView(
                        stagiaire,
                        account,
                        formation?.name ?? '—',
                        promotion?.code ?? '—',
                      )
                    }
                    className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
                    title="Voir le compte stagiaire"
                  >
                    <FiEye className="h-3.5 w-3.5" />
                    Voir le compte
                  </button>
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
        open={Boolean(accountView)}
        onClose={() => setAccountView(null)}
        title="Compte stagiaire"
        description={
          accountView
            ? `${fullName(accountView.stagiaire)} · ${accountView.formation} · ${accountView.promotion}`
            : undefined
        }
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAccountView(null)}>
              Fermer
            </Button>
            <Button
              variant="outline"
              icon={<FiCopy className="h-4 w-4" />}
              onClick={() => void copyText('Identifiants', accountMessage)}
            >
              Copier les identifiants
            </Button>
            <Button
              icon={<FiMail className="h-4 w-4" />}
              onClick={() => {
                window.location.href = accountMailtoUrl;
              }}
            >
              Envoyer par email
            </Button>
          </>
        }
      >
        {accountView && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border border-stroke bg-gray2/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
                  Compte stagiaire
                </p>
                <p className="mt-1 text-sm font-semibold text-black dark:text-white">
                  {fullName(accountView.account)}
                </p>
              </div>
              <Badge tone={statusTone(accountView.account.statut)}>
                {accountView.account.statut === 'active'
                  ? 'Actif'
                  : accountView.account.statut === 'blocked'
                    ? 'Bloqué'
                    : 'Inactif'}
              </Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Email de connexion
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {accountView.account.email}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiCopy className="h-3.5 w-3.5" />}
                    onClick={() => void copyText('Email', accountView.account.email)}
                  >
                    Copier
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Téléphone
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {accountView.account.phone ?? accountView.stagiaire.telephone ?? '—'}
                  </code>
                  {(accountView.account.phone ?? accountView.stagiaire.telephone) && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FiCopy className="h-3.5 w-3.5" />}
                      onClick={() =>
                        void copyText(
                          'Téléphone',
                          (accountView.account.phone ?? accountView.stagiaire.telephone) as string,
                        )
                      }
                    >
                      Copier
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="border border-stroke dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                    Mot de passe temporaire
                  </p>
                  {accountView.temporaryPassword ? (
                    <code className="mt-1 block break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                      {accountView.temporaryPassword}
                    </code>
                  ) : (
                    <p className="mt-1 text-xs text-body dark:text-body-dark">
                      Non affiché. Générez ou modifiez le mot de passe pour l’obtenir.
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {accountView.temporaryPassword && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FiCopy className="h-3.5 w-3.5" />}
                      onClick={() =>
                        void copyText('Mot de passe', accountView.temporaryPassword as string)
                      }
                    >
                      Copier
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiRefreshCw className="h-3.5 w-3.5" />}
                    loading={savingPassword}
                    onClick={() => void handleGeneratePassword()}
                  >
                    Générer
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FiEdit2 className="h-3.5 w-3.5" />}
                    onClick={() => setPasswordFormOpen((current) => !current)}
                  >
                    Modifier
                  </Button>
                </div>
              </div>

              {passwordError && (
                <div className="mx-4 mb-3 mt-3 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                  {passwordError}
                </div>
              )}

              {passwordFormOpen && (
                <form
                  onSubmit={handlePasswordSubmit}
                  className="space-y-3 border-t border-stroke px-4 py-4 dark:border-white/10"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Nouveau mot de passe" required hint="6 caractères minimum.">
                      <Input
                        type="password"
                        required
                        minLength={6}
                        value={passwordDraft}
                        onChange={(event) => setPasswordDraft(event.target.value)}
                      />
                    </Field>
                    <Field label="Confirmation" required>
                      <Input
                        type="password"
                        required
                        minLength={6}
                        value={passwordConfirm}
                        onChange={(event) => setPasswordConfirm(event.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="sm" loading={savingPassword}>
                      Enregistrer
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPasswordFormOpen(false);
                        setPasswordDraft('');
                        setPasswordConfirm('');
                        setPasswordError(null);
                      }}
                    >
                      Annuler
                    </Button>
                  </div>
                </form>
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                Lien de connexion
              </p>
              <code className="mt-1 block break-all border border-stroke bg-gray2 px-3 py-2 text-sm text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                {loginUrl}
              </code>
            </div>

            <p className="text-xs text-body dark:text-body-dark">
              Les identifiants copiés ou envoyés incluent le mot de passe temporaire uniquement
              lorsqu’il est affiché ci-dessus.
            </p>
          </div>
        )}
      </Modal>

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

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-body dark:text-body-dark">
                  Téléphone
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all border border-stroke bg-gray2 px-3 py-2 font-mono text-sm font-bold text-black dark:border-white/10 dark:bg-white/5 dark:text-white">
                    {credentials.account.phone ?? credentials.stagiaire.telephone ?? '—'}
                  </code>
                  {(credentials.account.phone ?? credentials.stagiaire.telephone) && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<FiCopy className="h-3.5 w-3.5" />}
                      onClick={() =>
                        void copyText(
                          'Téléphone',
                          (credentials.account.phone ?? credentials.stagiaire.telephone) as string,
                        )
                      }
                    >
                      Copier
                    </Button>
                  )}
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
