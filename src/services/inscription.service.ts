import { authService } from '@/services/auth.service';
import { dataService } from '@/services/data.service';
import { generateTemporaryPassword, updateUserPassword } from '@/services/user.service';
import type { Inscription, InscriptionStatus, Stagiaire, User } from '@/types/domain';

export type StagiaireAccount = {
  userId: string;
  email: string;
  phone?: string | null;
  temporaryPassword?: string;
  existingAccount: boolean;
};

export type CreateInscriptionWithAccountInput = {
  stagiaire: Stagiaire;
  formationId: string;
  promotionId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status: InscriptionStatus;
  responsibleId?: string | null;
};

export type CreateInscriptionWithAccountResult = {
  inscription: Inscription;
  account: StagiaireAccount;
};

export { generateTemporaryPassword };

export async function updateStagiairePassword(userId: string, password: string): Promise<void> {
  await updateUserPassword(userId, password);
}

async function findUserByEmail(email: string): Promise<User | null> {
  const users = await dataService.listAll<User>('users', { order: 'created_at.desc' });
  return users.find((user) => user.email.trim().toLowerCase() === email) ?? null;
}

export async function ensureStagiaireAccount(stagiaire: Stagiaire): Promise<StagiaireAccount> {
  if (stagiaire.statut === 'archive') {
    throw new Error('Le dossier stagiaire est archivé. Réactivez-le avant de créer son compte.');
  }

  const email = stagiaire.email?.trim().toLowerCase();

  if (!email) {
    throw new Error('Renseignez une adresse email pour le stagiaire avant de créer son compte.');
  }

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    if (existingUser.role !== 'stagiaire') {
      throw new Error('Un autre compte utilise déjà cet email. Vérifiez le compte avant de continuer.');
    }

    if (existingUser.stagiaire_id && existingUser.stagiaire_id !== stagiaire.id) {
      throw new Error('Ce compte est déjà lié à un autre dossier stagiaire.');
    }

    if (!existingUser.stagiaire_id) {
      await dataService.updateRow<User>('users', existingUser.id, {
        stagiaire_id: stagiaire.id,
      });
    }

    return {
      userId: existingUser.id,
      email,
      phone: existingUser.phone ?? stagiaire.telephone ?? null,
      existingAccount: true,
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const account = await authService.createAccount({
    email,
    password: temporaryPassword,
    first_name: stagiaire.prenom,
    last_name: stagiaire.nom,
    phone: stagiaire.telephone ?? undefined,
    role: 'stagiaire',
    statut: 'active',
    stagiaire_id: stagiaire.id,
  });
  const userId = account?.id ? String(account.id) : '';

  if (!userId) {
    throw new Error('Le compte stagiaire a été créé mais son identifiant est introuvable.');
  }

  return {
    userId,
    email,
    phone: stagiaire.telephone ?? null,
    temporaryPassword,
    existingAccount: false,
  };
}

export async function createInscriptionWithAccount(
  input: CreateInscriptionWithAccountInput,
): Promise<CreateInscriptionWithAccountResult> {
  const inscription = await dataService.createRow<Inscription>('inscriptions', {
    stagiaire_id: input.stagiaire.id,
    formation_id: input.formationId,
    promotion_id: input.promotionId ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    responsible_id: input.responsibleId ?? null,
    status: input.status,
  });

  if (!inscription?.id) {
    throw new Error('L’inscription n’a pas pu être créée.');
  }

  try {
    const account = await ensureStagiaireAccount(input.stagiaire);
    return { inscription, account };
  } catch (error) {
    try {
      await dataService.deleteRow('inscriptions', inscription.id);
    } catch {}

    throw error;
  }
}
