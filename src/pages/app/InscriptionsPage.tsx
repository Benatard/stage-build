import { useMemo, useState } from 'react';
import { FiCopy, FiDownload, FiEdit2, FiEye, FiFileText, FiMail, FiRefreshCw } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EntityManager } from '@/components/ui/EntityManager';
import { Checkbox, Field, Input } from '@/components/ui/Form';
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
import {
  displayValue,
  downloadExcel,
  openPdfDocument,
  safeFilenamePart,
  type ExportCell,
} from '@/utils/document-export';
import { formatDate, formatDateTime, fullName, getErrorMessage } from '@/utils/format';
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

type AccountExportRecord = {
  inscription: Inscription;
  stagiaire: Stagiaire;
  account?: User;
  password?: string;
  formation: string;
  promotion: string;
  institutionName: string;
};

type ExportTarget = 'excel' | 'pdf';

type ExportColumn = {
  key: string;
  label: string;
  width?: number;
  value: (record: AccountExportRecord, index: number) => ExportCell;
};

const genderLabels: Record<string, string> = {
  M: 'Masculin',
  F: 'Féminin',
  Autre: 'Autre',
};

const stagiaireStatusLabels: Record<string, string> = {
  candidat: 'Candidat',
  admis: 'Admis',
  actif: 'Actif',
  termine: 'Terminé',
  archive: 'Archivé',
};

const accountStatusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  blocked: 'Bloqué',
};

const excelExportColumns: ExportColumn[] = [
  { key: 'index', label: 'N°', width: 36, value: (_record, index) => index + 1 },
  { key: 'matricule', label: 'Matricule', width: 92, value: (record) => record.stagiaire.matricule },
  { key: 'nom', label: 'Nom', width: 100, value: (record) => record.stagiaire.nom },
  { key: 'postnom', label: 'Postnom', width: 82, value: (record) => displayValue(record.stagiaire.postnom) },
  { key: 'prenom', label: 'Prénom', width: 100, value: (record) => record.stagiaire.prenom },
  {
    key: 'sexe',
    label: 'Sexe',
    width: 62,
    value: (record) =>
      displayValue(
        record.stagiaire.sexe ? genderLabels[record.stagiaire.sexe] ?? record.stagiaire.sexe : null,
      ),
  },
  {
    key: 'date_naissance',
    label: 'Date de naissance',
    width: 100,
    value: (record) => formatDate(record.stagiaire.date_naissance),
  },
  {
    key: 'lieu_naissance',
    label: 'Lieu de naissance',
    width: 110,
    value: (record) => displayValue(record.stagiaire.lieu_naissance),
  },
  {
    key: 'telephone',
    label: 'Téléphone',
    width: 100,
    value: (record) => displayValue(record.stagiaire.telephone),
  },
  {
    key: 'email',
    label: 'Email personnel',
    width: 160,
    value: (record) => displayValue(record.stagiaire.email),
  },
  { key: 'adresse', label: 'Adresse', width: 170, value: (record) => displayValue(record.stagiaire.adresse) },
  {
    key: 'contact_urgence_nom',
    label: 'Contact d’urgence',
    width: 120,
    value: (record) => displayValue(record.stagiaire.contact_urgence_nom),
  },
  {
    key: 'contact_urgence_telephone',
    label: 'Téléphone d’urgence',
    width: 120,
    value: (record) => displayValue(record.stagiaire.contact_urgence_telephone),
  },
  {
    key: 'etablissement_origine',
    label: 'Établissement d’origine',
    width: 140,
    value: (record) => displayValue(record.stagiaire.etablissement_origine),
  },
  {
    key: 'niveau_etudes',
    label: 'Niveau d’études',
    width: 90,
    value: (record) => displayValue(record.stagiaire.niveau_etudes),
  },
  { key: 'diplome', label: 'Diplôme', width: 90, value: (record) => displayValue(record.stagiaire.diplome) },
  { key: 'domaine', label: 'Domaine', width: 110, value: (record) => displayValue(record.stagiaire.domaine) },
  {
    key: 'specialite',
    label: 'Spécialité',
    width: 110,
    value: (record) => displayValue(record.stagiaire.specialite),
  },
  {
    key: 'statut_stagiaire',
    label: 'Statut stagiaire',
    width: 90,
    value: (record) =>
      displayValue(stagiaireStatusLabels[record.stagiaire.statut] ?? record.stagiaire.statut),
  },
  {
    key: 'account_email',
    label: 'Email du compte',
    width: 160,
    value: (record) => record.account?.email ?? 'Compte non créé',
  },
  {
    key: 'account_phone',
    label: 'Téléphone du compte',
    width: 110,
    value: (record) => displayValue(record.account?.phone ?? record.stagiaire.telephone),
  },
  {
    key: 'password',
    label: 'Mot de passe',
    width: 105,
    value: (record) => record.password ?? 'Non disponible',
  },
  {
    key: 'account_status',
    label: 'Statut du compte',
    width: 100,
    value: (record) =>
      record.account
        ? accountStatusLabels[record.account.statut] ?? record.account.statut
        : 'Compte non créé',
  },
  {
    key: 'last_login',
    label: 'Dernière connexion',
    width: 120,
    value: (record) =>
      displayValue(record.account?.last_login_at ? formatDateTime(record.account.last_login_at) : null),
  },
  {
    key: 'must_change_password',
    label: 'Changement de mot de passe requis',
    width: 130,
    value: (record) =>
      record.account ? (record.account.must_change_password ? 'Oui' : 'Non') : '—',
  },
  { key: 'formation', label: 'Formation', width: 170, value: (record) => record.formation },
  { key: 'promotion', label: 'Promotion', width: 90, value: (record) => record.promotion },
  {
    key: 'start_date',
    label: 'Début de l’inscription',
    width: 100,
    value: (record) => formatDate(record.inscription.start_date),
  },
  {
    key: 'end_date',
    label: 'Fin de l’inscription',
    width: 100,
    value: (record) => formatDate(record.inscription.end_date),
  },
  {
    key: 'inscription_status',
    label: 'Statut de l’inscription',
    width: 110,
    value: (record) =>
      statusOptions.find((option) => option.value === record.inscription.status)?.label ??
      record.inscription.status,
  },
  {
    key: 'created_at',
    label: 'Inscrit le',
    width: 100,
    value: (record) => formatDate(record.inscription.created_at),
  },
  { key: 'institution', label: 'Institution', width: 140, value: (record) => record.institutionName },
];

const pdfExportColumns: ExportColumn[] = [
  { key: 'index', label: 'N°', value: (_record, index) => index + 1 },
  { key: 'matricule', label: 'Matricule', value: (record) => record.stagiaire.matricule },
  { key: 'full_name', label: 'Nom complet', value: (record) => fullName(record.stagiaire) },
  {
    key: 'sexe',
    label: 'Sexe',
    value: (record) =>
      displayValue(
        record.stagiaire.sexe ? genderLabels[record.stagiaire.sexe] ?? record.stagiaire.sexe : null,
      ),
  },
  {
    key: 'date_naissance',
    label: 'Naissance',
    value: (record) => formatDate(record.stagiaire.date_naissance),
  },
  {
    key: 'telephone',
    label: 'Téléphone',
    value: (record) => displayValue(record.account?.phone ?? record.stagiaire.telephone),
  },
  {
    key: 'email',
    label: 'Email personnel',
    value: (record) => displayValue(record.stagiaire.email),
  },
  {
    key: 'account_email',
    label: 'Compte stagiaire',
    value: (record) => record.account?.email ?? 'Non créé',
  },
  {
    key: 'password',
    label: 'Mot de passe',
    value: (record) => record.password ?? 'Non disponible',
  },
  { key: 'formation', label: 'Formation', value: (record) => record.formation },
  { key: 'promotion', label: 'Promotion', value: (record) => record.promotion },
  {
    key: 'period',
    label: 'Période',
    value: (record) =>
      `${formatDate(record.inscription.start_date)} → ${formatDate(record.inscription.end_date)}`,
  },
  {
    key: 'inscription_status',
    label: 'Inscription',
    value: (record) =>
      statusOptions.find((option) => option.value === record.inscription.status)?.label ??
      record.inscription.status,
  },
  {
    key: 'account_status',
    label: 'Compte',
    value: (record) =>
      record.account
        ? accountStatusLabels[record.account.statut] ?? record.account.statut
        : 'Non créé',
  },
];

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
  const { user, activeInstitution, activeInstitutionId } = useAuth();
  const { data, refresh } = useReferenceData();
  const [credentials, setCredentials] = useState<CredentialsState | null>(null);
  const [accountView, setAccountView] = useState<AccountViewState | null>(null);
  const [passwordDraft, setPasswordDraft] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [exportTarget, setExportTarget] = useState<ExportTarget | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<Record<ExportTarget, string[]>>({
    excel: excelExportColumns.map((column) => column.key),
    pdf: pdfExportColumns.map((column) => column.key),
  });
  const [resetMissingPasswords, setResetMissingPasswords] = useState(true);
  const [exportPeriod, setExportPeriod] = useState({ from: '', to: '' });
  const [exporting, setExporting] = useState(false);

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

  const exportInstitutionId = activeInstitutionId ?? user?.institution_id ?? null;

  function belongsToInstitution(record: { institution_id?: string | null }): boolean {
    if (!exportInstitutionId) return true;
    return !record.institution_id || record.institution_id === exportInstitutionId;
  }

  function inscriptionInPeriod(
    record: AccountExportRecord,
    from: string,
    to: string,
  ): boolean {
    if (!from && !to) return true;

    const start = record.inscription.start_date?.slice(0, 10) ?? null;
    const end = record.inscription.end_date?.slice(0, 10) ?? null;

    if (from) {
      const upperBound = end ?? start;
      if (upperBound && upperBound < from) return false;
    }

    if (to) {
      const lowerBound = start ?? end;
      if (lowerBound && lowerBound > to) return false;
    }

    return true;
  }

  function buildAccountExportRecords(): AccountExportRecord[] {
    const records: AccountExportRecord[] = [];

    data.inscriptions.forEach((inscription) => {
      if (!belongsToInstitution(inscription)) return;

      const stagiaire = data.stagiaires.find(
        (item) => item.id === inscription.stagiaire_id && belongsToInstitution(item),
      );
      if (!stagiaire) return;

      const account = data.users.find(
        (item) =>
          item.role === 'stagiaire' &&
          item.stagiaire_id === stagiaire.id &&
          belongsToInstitution(item),
      );
      const formation = data.formations.find((item) => item.id === inscription.formation_id);
      const promotion = data.promotions.find((item) => item.id === inscription.promotion_id);

      records.push({
        inscription,
        stagiaire,
        account,
        password: account ? getRememberedPassword(user?.id, account.id) : undefined,
        formation: formation?.name ?? '—',
        promotion: promotion?.code ?? '—',
        institutionName: activeInstitution?.name ?? '—',
      });
    });

    return records.sort((left, right) =>
      fullName(left.stagiaire).localeCompare(fullName(right.stagiaire), 'fr'),
    );
  }

  function exportMetadata(records: AccountExportRecord[]): Array<[string, string]> {
    return [
      ['Institution', activeInstitution?.name ?? 'Toutes les institutions'],
      ...(activeInstitution?.code ? ([['Code', activeInstitution.code]] as Array<[string, string]>) : []),
      ...(activeInstitution?.city ? ([['Ville', activeInstitution.city]] as Array<[string, string]>) : []),
      ...(exportPeriod.from || exportPeriod.to
        ? ([
            [
              'Période',
              `${exportPeriod.from ? formatDate(exportPeriod.from) : '…'} → ${
                exportPeriod.to ? formatDate(exportPeriod.to) : '…'
              }`,
            ],
          ] as Array<[string, string]>)
        : []),
      ['Inscriptions', String(records.length)],
      ['Mots de passe disponibles', String(records.filter((record) => record.password).length)],
      ['Lien de connexion', `${window.location.origin}/login`],
      ['Exporté le', formatDateTime(new Date().toISOString())],
    ];
  }

  const exportNote =
    'Document confidentiel destiné au stagiaire et à l’établissement. Les mots de passe affichés ont été générés ou réinitialisés lors de cet export : communiquez-les uniquement au stagiaire concerné. Les mots de passe plus anciens restent chiffrés en base et ne peuvent pas être relus.';

  function exportAccountsExcel(records: AccountExportRecord[], selectedKeys: string[]) {
    const columns = excelExportColumns.filter((column) => selectedKeys.includes(column.key));
    const headers = columns.map((column) => column.label);
    const rows: ExportCell[][] = records.map((record, index) =>
      columns.map((column) => column.value(record, index)),
    );

    downloadExcel({
      filename: `comptes-stagiaires-${safeFilenamePart(activeInstitution?.name ?? 'institution')}-${new Date().toISOString().slice(0, 10)}`,
      title: 'Comptes stagiaires inscrits',
      subtitle: `${activeInstitution?.name ?? 'Toutes les institutions'} · ${records.length} inscription(s)`,
      sheetName: 'Comptes stagiaires',
      organization: activeInstitution
        ? {
            name: activeInstitution.name,
            address: activeInstitution.address,
            email: activeInstitution.email,
            phone: activeInstitution.phone,
            website: activeInstitution.website,
            logoUrl: activeInstitution.logo_url,
          }
        : undefined,
      meta: exportMetadata(records),
      table: {
        headers,
        rows,
        widths: columns.map((column) => column.width ?? 100),
      },
      note: exportNote,
    });
  }

  function exportAccountsPdf(records: AccountExportRecord[], selectedKeys: string[]) {
    const columns = pdfExportColumns.filter((column) => selectedKeys.includes(column.key));
    const headers = columns.map((column) => column.label);
    const rows: ExportCell[][] = records.map((record, index) =>
      columns.map((column) => column.value(record, index)),
    );

    const opened = openPdfDocument({
      filename: `comptes-stagiaires-${safeFilenamePart(activeInstitution?.name ?? 'institution')}-${new Date().toISOString().slice(0, 10)}`,
      title: 'Comptes stagiaires inscrits',
      subtitle: `${activeInstitution?.name ?? 'Toutes les institutions'} · ${records.length} inscription(s)`,
      organization: activeInstitution
        ? {
            name: activeInstitution.name,
            address: activeInstitution.address,
            email: activeInstitution.email,
            phone: activeInstitution.phone,
            website: activeInstitution.website,
            logoUrl: activeInstitution.logo_url,
          }
        : undefined,
      meta: exportMetadata(records),
      table: { headers, rows },
      note: exportNote,
      landscape: true,
    });

    if (!opened) {
      notifyError('Export PDF bloqué', 'Autorisez les fenêtres pop-up puis réessayez.');
    }
  }

  function toggleExportColumn(target: ExportTarget, key: string) {
    setSelectedColumns((current) => ({
      ...current,
      [target]: current[target].includes(key)
        ? current[target].filter((item) => item !== key)
        : [...current[target], key],
    }));
  }

  function setAllExportColumns(target: ExportTarget, keys: string[]) {
    setSelectedColumns((current) => ({ ...current, [target]: keys }));
  }

  async function runExport() {
    if (!exportTarget) return;

    const records = buildAccountExportRecords().filter((record) =>
      inscriptionInPeriod(record, exportPeriod.from, exportPeriod.to),
    );
    const selectedKeys = selectedColumns[exportTarget];

    if (records.length === 0) {
      notifyError(
        'Aucune inscription',
        exportPeriod.from || exportPeriod.to
          ? 'Aucune inscription ne correspond à la période sélectionnée.'
          : 'Aucune inscription à exporter pour cet établissement.',
      );
      return;
    }

    if (selectedKeys.length === 0) {
      notifyError('Aucune colonne', 'Sélectionnez au moins une colonne à exporter.');
      return;
    }

    setExporting(true);

    try {
      if (resetMissingPasswords && selectedKeys.includes('password')) {
        for (const record of records) {
          if (!record.account || record.password) continue;
          const password = generateTemporaryPassword();
          await updateStagiairePassword(record.account.id, password);
          rememberPassword(user?.id, record.account.id, password);
          record.password = password;
        }
      }

      if (exportTarget === 'excel') {
        exportAccountsExcel(records, selectedKeys);
      } else {
        exportAccountsPdf(records, selectedKeys);
      }

      setExportTarget(null);
    } catch (error) {
      notifyError('Export impossible', getErrorMessage(error));
    } finally {
      setExporting(false);
    }
  }

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

  const activeExportTarget: ExportTarget = exportTarget ?? 'excel';
  const exportColumns = activeExportTarget === 'pdf' ? pdfExportColumns : excelExportColumns;
  const exportRecords = exportTarget
    ? buildAccountExportRecords().filter((record) =>
        inscriptionInPeriod(record, exportPeriod.from, exportPeriod.to),
      )
    : [];
  const selectedExportKeys = selectedColumns[activeExportTarget];
  const missingPasswordCount = exportRecords.filter(
    (record) => record.account && !record.password,
  ).length;

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
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-body dark:text-body-dark">
              Extraire uniquement les inscriptions de l’établissement
            </span>
            <Button
              size="sm"
              variant="outline"
              icon={<FiDownload className="h-3.5 w-3.5" />}
              disabled={data.inscriptions.length === 0}
              onClick={() => {
                setResetMissingPasswords(true);
                setExportTarget('excel');
              }}
            >
              Exporter Excel
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={<FiFileText className="h-3.5 w-3.5" />}
              disabled={data.inscriptions.length === 0}
              onClick={() => {
                setResetMissingPasswords(true);
                setExportTarget('pdf');
              }}
            >
              Exporter PDF
            </Button>
          </div>
        }
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
        open={Boolean(exportTarget)}
        onClose={() => {
          if (!exporting) setExportTarget(null);
        }}
        title={exportTarget === 'pdf' ? 'Exporter en PDF' : 'Exporter en Excel'}
        description="Choisissez la période et les colonnes à inclure dans le document, puis vérifiez les mots de passe avant l’envoi aux stagiaires."
        size="xl"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setExportTarget(null)}
              disabled={exporting}
            >
              Annuler
            </Button>
            <Button
              onClick={() => void runExport()}
              loading={exporting}
              disabled={selectedExportKeys.length === 0}
              icon={exportTarget === 'pdf' ? <FiFileText className="h-4 w-4" /> : <FiDownload className="h-4 w-4" />}
            >
              {exportTarget === 'pdf' ? 'Ouvrir le PDF' : 'Télécharger l’Excel'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-3 border border-stroke p-4 dark:border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-black dark:text-white">
                  Période des inscriptions
                </p>
                <p className="mt-1 text-xs text-body dark:text-body-dark">
                  Seules les inscriptions dont la période chevauche cet intervalle seront
                  exportées. Laissez vide pour tout inclure.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={!exportPeriod.from && !exportPeriod.to}
                onClick={() => setExportPeriod({ from: '', to: '' })}
              >
                Réinitialiser
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Du">
                <Input
                  type="date"
                  value={exportPeriod.from}
                  max={exportPeriod.to || undefined}
                  onChange={(event) =>
                    setExportPeriod((current) => ({ ...current, from: event.target.value }))
                  }
                />
              </Field>
              <Field label="Au">
                <Input
                  type="date"
                  value={exportPeriod.to}
                  min={exportPeriod.from || undefined}
                  onChange={(event) =>
                    setExportPeriod((current) => ({ ...current, to: event.target.value }))
                  }
                />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border border-stroke bg-gray2/60 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <div>
              <p className="text-sm font-semibold text-black dark:text-white">
                {exportRecords.length} inscription(s) à exporter
              </p>
              <p className="mt-1 text-xs text-body dark:text-body-dark">
                {selectedExportKeys.length} colonne(s) sélectionnée(s) sur {exportColumns.length}.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAllExportColumns(activeExportTarget, exportColumns.map((column) => column.key))}
              >
                Tout sélectionner
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAllExportColumns(activeExportTarget, [])}
              >
                Tout désélectionner
              </Button>
            </div>
          </div>

          <div className="grid max-h-[45vh] grid-cols-1 gap-x-6 gap-y-2 overflow-y-auto border border-stroke p-4 dark:border-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {exportColumns.map((column) => (
              <Checkbox
                key={column.key}
                label={column.label}
                checked={selectedExportKeys.includes(column.key)}
                onChange={() => toggleExportColumn(activeExportTarget, column.key)}
              />
            ))}
          </div>

          {selectedExportKeys.includes('password') && (
            <div className="space-y-2 border border-amber-300 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              <p className="font-semibold">
                Mot de passe : {exportRecords.length - missingPasswordCount} disponible(s) ·{' '}
                {missingPasswordCount} à générer
              </p>
              <p>
                Les mots de passe existants restent chiffrés en base et ne peuvent pas être relus.
                Pour que chaque stagiaire puisse se connecter, un nouveau mot de passe temporaire
                peut être généré pour les comptes qui n’en ont pas. Il remplace alors l’ancien : les
                identifiants précédemment communiqués ne fonctionneront plus.
              </p>
              {missingPasswordCount > 0 && (
                <Checkbox
                  label={`Générer un nouveau mot de passe pour les ${missingPasswordCount} compte(s) sans mot de passe disponible`}
                  checked={resetMissingPasswords}
                  onChange={(event) => setResetMissingPasswords(event.target.checked)}
                  disabled={exporting}
                />
              )}
            </div>
          )}
        </div>
      </Modal>

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
