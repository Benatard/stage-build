import { dataService } from '@/services/data.service';
import { authService } from '@/services/auth.service';
import type {
  Formation,
  Inscription,
  Promotion,
  Reservation,
  ReservationStatus,
  Stagiaire,
} from '@/types/domain';
import { getErrorMessage } from '@/utils/format';

type SqlTuple = Array<string | number | boolean | null>;

type SeatRow = {
  promotion_id: string;
  status: string;
};

export type ReservationAvailability = {
  formation: Formation;
  promotion: Promotion;
  capacity: number | null;
  used: number;
  pending: number;
  available: number | null;
  isOpen: boolean;
};

export type PublicReservationInput = {
  nom: string;
  postnom?: string;
  prenom: string;
  sexe?: 'M' | 'F' | 'Autre';
  date_naissance?: string;
  telephone: string;
  email: string;
  formation_id: string;
  promotion_id: string;
};

export type ConfirmReservationInput = {
  reservation: Reservation;
  formations: Formation[];
  promotions: Promotion[];
  currentUserId: string;
};

export type ReservationConfirmation = {
  reservation: Reservation;
  stagiaireId: string;
  inscriptionId: string;
  userId: string;
  temporaryPassword?: string;
  existingAccount: boolean;
};

const ACTIVE_INSCRIPTION_STATUSES = new Set(['en_attente', 'validee', 'terminee']);
const OPEN_PROMOTION_STATUSES = new Set(['planifiee', 'active']);
const ACTIVE_FORMATION_STATUSES = new Set(['active']);

function sqlLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

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

async function sqlRows(query: string): Promise<SqlTuple[]> {
  const response = await dataService.sql<SqlTuple>(query);
  return (response.rows ?? []) as SqlTuple[];
}

async function countWhere(table: string, column: string, value: string): Promise<number> {
  const rows = await sqlRows(
    `select count(*) from ${table} where ${column} = ${sqlLiteral(value)}`,
  );
  return Number(rows[0]?.[0] ?? 0);
}

async function readSeatRows(table: 'reservations' | 'inscriptions'): Promise<SeatRow[]> {
  const rows = await sqlRows(`select promotion_id, status from ${table}`);
  return rows
    .map(([promotionId, status]) => ({
      promotion_id: typeof promotionId === 'string' ? promotionId : '',
      status: typeof status === 'string' ? status : '',
    }))
    .filter((row) => row.promotion_id && row.status);
}

function computeAvailability(
  formations: Formation[],
  promotions: Promotion[],
  inscriptions: SeatRow[],
  reservations: SeatRow[],
): ReservationAvailability[] {
  const formationsById = new Map(formations.map((formation) => [formation.id, formation]));
  const usedByPromotion = new Map<string, number>();
  const pendingByPromotion = new Map<string, number>();

  inscriptions.forEach((row) => {
    if (!ACTIVE_INSCRIPTION_STATUSES.has(row.status)) return;
    usedByPromotion.set(row.promotion_id, (usedByPromotion.get(row.promotion_id) ?? 0) + 1);
  });

  reservations.forEach((row) => {
    if (row.status !== 'en_attente') return;
    pendingByPromotion.set(row.promotion_id, (pendingByPromotion.get(row.promotion_id) ?? 0) + 1);
  });

  return promotions
    .filter((promotion) => OPEN_PROMOTION_STATUSES.has(promotion.status))
    .map((promotion) => {
      const formation = formationsById.get(promotion.formation_id);
      if (!formation || !ACTIVE_FORMATION_STATUSES.has(formation.status)) return null;

      const used = usedByPromotion.get(promotion.id) ?? 0;
      const pending = pendingByPromotion.get(promotion.id) ?? 0;
      const capacity =
        typeof promotion.capacity === 'number' && Number.isFinite(promotion.capacity)
          ? promotion.capacity
          : null;
      const available = capacity === null ? null : Math.max(capacity - used - pending, 0);

      return {
        formation,
        promotion,
        capacity,
        used,
        pending,
        available,
        isOpen: capacity === null || (available ?? 0) > 0,
      };
    })
    .filter((item): item is ReservationAvailability => item !== null)
    .sort(
      (left, right) =>
        left.formation.name.localeCompare(right.formation.name, 'fr') ||
        left.promotion.code.localeCompare(right.promotion.code, 'fr'),
    );
}

export function buildAvailability(
  formations: Formation[],
  promotions: Promotion[],
  inscriptions: Inscription[],
  reservations: Reservation[],
): ReservationAvailability[] {
  return computeAvailability(
    formations,
    promotions,
    inscriptions.map((inscription) => ({
      promotion_id: inscription.promotion_id ?? '',
      status: inscription.status,
    })),
    reservations.map((reservation) => ({
      promotion_id: reservation.promotion_id,
      status: reservation.status,
    })),
  );
}

export async function loadAvailability(): Promise<ReservationAvailability[]> {
  const [formations, promotions, reservationSeats, inscriptionSeats] = await Promise.all([
    dataService.listAll<Formation>('formations', { order: 'name.asc' }),
    dataService.listAll<Promotion>('promotions', { order: 'start_date.desc' }),
    readSeatRows('reservations'),
    readSeatRows('inscriptions'),
  ]);

  return computeAvailability(formations, promotions, inscriptionSeats, reservationSeats);
}

async function nextReference(): Promise<string> {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const reference = `RES-${year}-${randomCode(6)}`;
    const count = await countWhere('reservations', 'reference', reference);
    if (count === 0) return reference;
  }

  throw new Error('Impossible de générer une référence de réservation. Réessayez.');
}

function assertText(value: string | undefined, label: string): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) throw new Error(`${label} est obligatoire.`);
  return trimmed;
}

export async function createReservation(input: PublicReservationInput): Promise<Reservation> {
  const nom = assertText(input.nom, 'Le nom');
  const prenom = assertText(input.prenom, 'Le prénom');
  const telephone = assertText(input.telephone, 'Le téléphone');
  const email = assertText(input.email, 'L’email').toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('L’adresse email n’est pas valide.');
  }

  if (telephone.replace(/\D/g, '').length < 6) {
    throw new Error('Le numéro de téléphone n’est pas valide.');
  }

  if (input.sexe && !['M', 'F', 'Autre'].includes(input.sexe)) {
    throw new Error('Le sexe sélectionné n’est pas valide.');
  }

  const availability = await loadAvailability();
  const seat = availability.find(
    (item) =>
      item.formation.id === input.formation_id && item.promotion.id === input.promotion_id,
  );

  if (!seat) {
    throw new Error('Cette formation ou cette promotion n’est pas ouverte aux réservations.');
  }

  if (!seat.isOpen) {
    throw new Error('Cette promotion est complète. Choisissez une autre promotion.');
  }

  const duplicateRows = await sqlRows(
    `select formation_id, promotion_id, status from reservations where email = ${sqlLiteral(email)}`,
  );
  const duplicate = duplicateRows.some(
    ([formationId, promotionId, status]) =>
      formationId === input.formation_id &&
      promotionId === input.promotion_id &&
      (status === 'en_attente' || status === 'confirmee'),
  );

  if (duplicate) {
    throw new Error('Une réservation existe déjà pour cette formation et cette promotion.');
  }

  const [stagiaireCount, userCount] = await Promise.all([
    countWhere('stagiaires', 'email', email),
    countWhere('users', 'email', email),
  ]);

  if (stagiaireCount > 0 || userCount > 0) {
    throw new Error(
      'Un dossier ou un compte existe déjà avec cet email. Contactez l’administration pour une nouvelle inscription.',
    );
  }

  const reference = await nextReference();

  const reservation = await dataService.createRow<Reservation>('reservations', {
    reference,
    nom,
    postnom: input.postnom?.trim() || null,
    prenom,
    sexe: input.sexe ?? null,
    date_naissance: input.date_naissance || null,
    telephone,
    email,
    formation_id: input.formation_id,
    promotion_id: input.promotion_id,
    status: 'en_attente',
    notes: null,
  });

  if (!reservation?.id) {
    throw new Error('La réservation n’a pas pu être créée.');
  }

  return reservation;
}

export async function cancelReservation(reservation: Reservation): Promise<Reservation> {
  if (reservation.status !== 'en_attente') {
    throw new Error('Seules les réservations en attente peuvent être annulées.');
  }

  const updated = await dataService.updateRow<Reservation>('reservations', reservation.id, {
    status: 'annulee',
  });

  if (!updated) throw new Error('L’annulation n’a pas pu être enregistrée.');
  return updated;
}

async function nextMatricule(): Promise<string> {
  const year = new Date().getFullYear();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const matricule = `STG-${year}-${randomDigits(4)}`;
    const count = await countWhere('stagiaires', 'matricule', matricule);
    if (count === 0) return matricule;
  }

  throw new Error('Impossible de générer un matricule. Réessayez.');
}

async function findStagiaireByEmail(
  email: string,
): Promise<{ id: string; statut: string } | null> {
  const rows = await sqlRows(
    `select id, statut from stagiaires where email = ${sqlLiteral(email)}`,
  );
  const row = rows[0];

  if (!row?.[0]) return null;

  return {
    id: String(row[0]),
    statut: String(row[1] ?? ''),
  };
}

async function findUserByEmail(
  email: string,
): Promise<{ id: string; role: string; stagiaire_id: string | null } | null> {
  const rows = await sqlRows(
    `select id, role, stagiaire_id from users where email = ${sqlLiteral(email)}`,
  );
  const row = rows[0];

  if (!row?.[0]) return null;

  return {
    id: String(row[0]),
    role: String(row[1] ?? ''),
    stagiaire_id: row[2] ? String(row[2]) : null,
  };
}

function newTemporaryPassword(): string {
  return `SB-${randomCode(4)}${randomDigits(4)}`;
}

export async function confirmReservation(
  input: ConfirmReservationInput,
): Promise<ReservationConfirmation> {
  const { reservation, formations, promotions, currentUserId } = input;

  if (!currentUserId) {
    throw new Error('Utilisateur administrateur introuvable.');
  }

  const [freshInscriptions, freshReservations] = await Promise.all([
    dataService.listAll<Inscription>('inscriptions', { order: 'created_at.desc' }),
    dataService.listAll<Reservation>('reservations', { order: 'created_at.desc' }),
  ]);

  const currentReservation =
    freshReservations.find((item) => item.id === reservation.id) ?? reservation;

  if (currentReservation.status !== 'en_attente') {
    throw new Error(
      currentReservation.status === 'confirmee'
        ? 'Cette réservation est déjà confirmée.'
        : 'Cette réservation a été annulée.',
    );
  }

  const promotion = promotions.find((item) => item.id === currentReservation.promotion_id);
  const formation = formations.find((item) => item.id === currentReservation.formation_id);

  if (!promotion || !formation) {
    throw new Error('La formation ou la promotion liée à cette réservation est introuvable.');
  }

  const capacity =
    typeof promotion.capacity === 'number' && Number.isFinite(promotion.capacity)
      ? promotion.capacity
      : null;
  const used = freshInscriptions.filter(
    (item) =>
      item.promotion_id === promotion.id && ACTIVE_INSCRIPTION_STATUSES.has(item.status),
  ).length;
  const pendingOthers = freshReservations.filter(
    (item) =>
      item.id !== currentReservation.id &&
      item.promotion_id === promotion.id &&
      item.status === 'en_attente',
  ).length;
  const alreadyHasInscription = Boolean(currentReservation.inscription_id);

  if (capacity !== null && used + pendingOthers + (alreadyHasInscription ? 0 : 1) > capacity) {
    throw new Error(
      'La promotion est complète. Libérez une place ou annulez une réservation avant de confirmer.',
    );
  }

  let stagiaireId = currentReservation.stagiaire_id || null;
  let inscriptionId = currentReservation.inscription_id || null;
  let userId = currentReservation.user_id || null;
  let temporaryPassword: string | undefined;
  let existingAccount = false;
  let createdStagiaireId: string | null = null;
  let createdInscriptionId: string | null = null;
  let createdUserId: string | null = null;

  try {
    if (!stagiaireId) {
      const existingStagiaire = await findStagiaireByEmail(currentReservation.email);

      if (existingStagiaire) {
        if (existingStagiaire.statut === 'archive') {
          throw new Error('Le dossier stagiaire associé à cet email est archivé.');
        }
        stagiaireId = existingStagiaire.id;
      } else {
        const matricule = await nextMatricule();
        const stagiaire = await dataService.createRow<Stagiaire>('stagiaires', {
          matricule,
          nom: currentReservation.nom,
          postnom: currentReservation.postnom ?? null,
          prenom: currentReservation.prenom,
          sexe: currentReservation.sexe ?? null,
          date_naissance: currentReservation.date_naissance ?? null,
          telephone: currentReservation.telephone,
          email: currentReservation.email,
          statut: 'admis',
        });

        if (!stagiaire?.id) {
          throw new Error('Le dossier stagiaire n’a pas pu être créé.');
        }

        stagiaireId = stagiaire.id;
        createdStagiaireId = stagiaire.id;
      }
    }

    if (!inscriptionId) {
      const existingInscription = freshInscriptions.find(
        (item) =>
          item.stagiaire_id === stagiaireId &&
          item.formation_id === currentReservation.formation_id &&
          item.promotion_id === currentReservation.promotion_id &&
          item.status !== 'annulee',
      );

      if (existingInscription) {
        inscriptionId = existingInscription.id;
      } else {
        const inscription = await dataService.createRow<Inscription>('inscriptions', {
          stagiaire_id: stagiaireId,
          formation_id: currentReservation.formation_id,
          promotion_id: currentReservation.promotion_id,
          start_date: promotion.start_date ?? null,
          end_date: promotion.end_date ?? null,
          responsible_id: currentUserId,
          status: 'validee',
        });

        if (!inscription?.id) {
          throw new Error('L’inscription n’a pas pu être créée.');
        }

        inscriptionId = inscription.id;
        createdInscriptionId = inscription.id;
      }
    }

    if (!userId) {
      const existingUser = await findUserByEmail(currentReservation.email);

      if (existingUser) {
        if (existingUser.role !== 'stagiaire' || existingUser.stagiaire_id !== stagiaireId) {
          throw new Error(
            'Un autre compte utilise déjà cet email. Vérifiez le compte avant de confirmer.',
          );
        }

        userId = existingUser.id;
        existingAccount = true;
      } else {
        temporaryPassword = newTemporaryPassword();
        const account = await authService.createAccount({
          email: currentReservation.email,
          password: temporaryPassword,
          first_name: currentReservation.prenom,
          last_name: currentReservation.nom,
          phone: currentReservation.telephone,
          role: 'stagiaire',
          statut: 'active',
          stagiaire_id: stagiaireId,
        });
        const createdId = account?.id ? String(account.id) : '';

        if (!createdId) {
          throw new Error('Le compte stagiaire a été créé mais son identifiant est introuvable.');
        }

        userId = createdId;
        createdUserId = createdId;
      }
    }

    const updated = await dataService.updateRow<Reservation>('reservations', currentReservation.id, {
      status: 'confirmee' satisfies ReservationStatus,
      confirmed_at: new Date().toISOString(),
      confirmed_by: currentUserId,
      stagiaire_id: stagiaireId,
      inscription_id: inscriptionId,
      user_id: userId,
    });

    if (!updated) {
      throw new Error('La confirmation n’a pas pu être enregistrée.');
    }

    return {
      reservation: updated,
      stagiaireId,
      inscriptionId,
      userId,
      temporaryPassword,
      existingAccount,
    };
  } catch (error) {
    let alreadyConfirmed = false;

    try {
      const latest = await dataService.findRow<Reservation>('reservations', currentReservation.id);
      alreadyConfirmed = latest.status === 'confirmee';
    } catch {
      alreadyConfirmed = false;
    }

    if (!alreadyConfirmed) {
      if (createdUserId) {
        try {
          await dataService.deleteRow('users', createdUserId);
        } catch {}
      }

      if (createdInscriptionId) {
        try {
          await dataService.deleteRow('inscriptions', createdInscriptionId);
        } catch {}
      }

      if (createdStagiaireId) {
        try {
          await dataService.deleteRow('stagiaires', createdStagiaireId);
        } catch {}
      }
    }

    throw error;
  }
}

export function isReservationsTableMissing(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('reservations') &&
    (message.includes('does not exist') ||
      message.includes('n’existe pas') ||
      message.includes("n'existe pas") ||
      message.includes('not found') ||
      message.includes('introuvable') ||
      message.includes('relation'))
  );
}
