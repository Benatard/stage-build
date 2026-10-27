import bcrypt from 'bcryptjs';
import { authService } from '@/services/auth.service';
import { dataService } from '@/services/data.service';
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

function randomInt(max: number): number {
  const values = new Uint32Array(1);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function randomCode(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join('');
}

function randomDigits(length: number): string {
  return Array.from({ length }, () => String(randomInt(10))).join('');
}

function newTemporaryPassword(): string {
  return `SB-${randomCode(4)}${randomDigits(4)}`;
}

export function generateTemporaryPassword(): string {
  return newTemporaryPassword();
}

export async function updateStagiairePassword(userId: string, password: string): Promise<void> {
  const value = password.trim();

  if (value.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
  }

  const passwordHash = await bcrypt.hash(value, 10);
  await dataService.updateRow<User>('users', userId, { password_hash: passwordHash });
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

  const temporaryPassword = newTemporaryPassword();
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
