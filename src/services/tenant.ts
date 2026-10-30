import { saasConfig } from '@/config/env';
import type { ForgeListFilter, ForgeListParams } from '@/services/forge/types';
import { getErrorMessage } from '@/utils/format';

export const TENANT_TABLES = new Set<string>([
  'users',
  'stagiaires',
  'formations',
  'modules',
  'promotions',
  'inscriptions',
  'reservations',
  'affectations',
  'seances',
  'presences',
  'evaluations',
  'notes',
  'qcm_questions',
  'qcm_attempts',
  'travaux_pratiques',
  'travaux_soumissions',
  'competences',
  'competence_levels',
  'implications',
  'comportements',
  'observations',
  'improvement_plans',
  'improvement_actions',
  'intermediate_evaluations',
  'stage_objectives',
  'stage_journal',
  'final_projects',
  'final_evaluations',
  'bulletins',
  'documents',
  'notifications',
  'audit_logs',
  'settings',
  'grading_rules',
  'institution_memberships',
  'services',
  'document_templates',
  'institution_invitations',
]);

const GLOBAL_TABLES = new Set<string>([
  'institutions',
  'saas_plans',
  'institution_subscriptions',
  'membership_roles',
  'platform_settings',
]);

let currentInstitutionId: string | null = null;
let platformMode = false;
let tenantColumnMissing = false;

export function setTenantContext(input: {
  institutionId: string | null;
  platformMode?: boolean;
}): void {
  currentInstitutionId = input.institutionId || null;
  platformMode = Boolean(input.platformMode);
}

export function getTenantId(): string | null {
  return currentInstitutionId;
}

export function isPlatformMode(): boolean {
  return platformMode;
}

export function isTenantTable(table: string): boolean {
  if (GLOBAL_TABLES.has(table)) return false;
  return TENANT_TABLES.has(table);
}

export function isTenantScopingActive(): boolean {
  return saasConfig.multitenancyEnabled && !tenantColumnMissing;
}

export function shouldScopeTable(table: string): boolean {
  if (!isTenantScopingActive()) return false;
  if (!isTenantTable(table)) return false;
  if (platformMode) return false;
  return Boolean(currentInstitutionId);
}

export function markTenantColumnMissing(): void {
  tenantColumnMissing = true;
}

export function isTenantColumnMissing(): boolean {
  return tenantColumnMissing;
}

export function isTenantColumnError(error: unknown): boolean {
  const message = getErrorMessage(error, '').toLowerCase();
  return (
    message.includes('institution_id') &&
    (message.includes('does not exist') ||
      message.includes('n’existe pas') ||
      message.includes("n'existe pas") ||
      message.includes('unknown column') ||
      message.includes('undefined column') ||
      message.includes('unknown field') ||
      message.includes('invalid column') ||
      message.includes('column not found'))
  );
}

export function withTenantFilter(
  table: string,
  params: ForgeListParams,
): ForgeListParams {
  if (!shouldScopeTable(table) || !currentInstitutionId) return params;

  return {
    ...params,
    filters: {
      ...(params.filters ?? {}),
      institution_id: currentInstitutionId,
    },
  };
}

export function withTenantScope(
  table: string,
  scope: Record<string, ForgeListFilter | null | undefined>,
): Record<string, ForgeListFilter | null | undefined> {
  if (!shouldScopeTable(table) || !currentInstitutionId) return scope;
  return { ...scope, institution_id: currentInstitutionId };
}

export function withTenantPayload(
  table: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (!shouldScopeTable(table) || !currentInstitutionId) return data;

  const provided = data.institution_id;
  if (provided && provided !== currentInstitutionId) {
    throw new Error(
      'Le rattachement à une institution ne peut pas être modifié depuis le client.',
    );
  }

  return { ...data, institution_id: currentInstitutionId };
}

export function assertRowInTenant(
  table: string,
  row: Record<string, unknown> | null | undefined,
): void {
  if (!row) return;
  if (!shouldScopeTable(table) || !currentInstitutionId) return;

  if (!('institution_id' in row)) {
    markTenantColumnMissing();
    return;
  }

  const rowInstitution = row.institution_id;
  if (rowInstitution === null && table === 'users') return;

  if (rowInstitution !== currentInstitutionId) {
    throw new Error(
      'Accès refusé : cette donnée appartient à une autre institution.',
    );
  }
}
