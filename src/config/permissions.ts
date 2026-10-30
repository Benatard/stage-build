import type { Role, SaasRole } from '@/types/domain';

export const ROLE_LABELS: Record<Role, string> = {
  supra_admin: 'Super administrateur plateforme',
  directeur: 'Directeur d’institution',
  admin_institution: 'Administrateur institutionnel',
  responsable_formation: 'Responsable de formation',
  responsable_pedagogique: 'Responsable pédagogique',
  formateur: 'Formateur',
  encadreur: 'Encadreur / Maître de stage',
  service_administratif: 'Service administratif',
  stagiaire: 'Stagiaire',
  rh: 'Ressources humaines',
  auditeur: 'Auditeur / Superviseur',
  admin: 'Administrateur système (hérité)',
  direction: 'Direction (hérité)',
  administration: 'Administration (hérité)',
  maitre_stage: 'Maître de stage (hérité)',
};

export const SAAS_ROLES: SaasRole[] = [
  'supra_admin',
  'directeur',
  'admin_institution',
  'responsable_formation',
  'responsable_pedagogique',
  'formateur',
  'encadreur',
  'service_administratif',
  'stagiaire',
  'rh',
  'auditeur',
];

export const ROLE_OPTIONS = SAAS_ROLES.map((value) => ({
  value,
  label: ROLE_LABELS[value],
}));

export const LEGACY_ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[])
  .filter((role) => !SAAS_ROLES.includes(role as SaasRole))
  .map((value) => ({ value, label: ROLE_LABELS[value] }));

export function roleOptionsFor(actorRole?: Role | null) {
  if (actorRole === 'supra_admin' || actorRole === 'admin') return ROLE_OPTIONS;
  return ROLE_OPTIONS.filter(
    (option) => option.value !== 'supra_admin' && option.value !== 'directeur',
  );
}

export type WorkspaceInfo = {
  label: string;
  path: string;
};

export const ROLE_WORKSPACES: Record<Role, WorkspaceInfo> = {
  supra_admin: { label: 'Console plateforme', path: '/app/plateforme' },
  directeur: { label: 'Espace Direction', path: '/app' },
  admin_institution: { label: 'Espace Administrateur institutionnel', path: '/app' },
  responsable_formation: { label: 'Espace Responsable de formation', path: '/app' },
  responsable_pedagogique: { label: 'Espace Responsable pédagogique', path: '/app' },
  formateur: { label: 'Espace Formateur', path: '/app' },
  encadreur: { label: 'Espace Encadreur', path: '/app' },
  service_administratif: { label: 'Espace Service administratif', path: '/app' },
  stagiaire: { label: 'Mon espace stagiaire', path: '/app/mon-espace' },
  rh: { label: 'Espace Ressources humaines', path: '/app' },
  auditeur: { label: 'Espace Auditeur / Superviseur', path: '/app' },
  admin: { label: 'Console plateforme (hérité)', path: '/app/plateforme' },
  direction: { label: 'Espace Direction (hérité)', path: '/app' },
  administration: { label: 'Espace Administration (hérité)', path: '/app' },
  maitre_stage: { label: 'Espace Maître de stage (hérité)', path: '/app' },
};

export function workspaceForRole(role: Role): WorkspaceInfo {
  return ROLE_WORKSPACES[role] ?? ROLE_WORKSPACES.stagiaire;
}

const INSTITUTION_ADMIN_PERMISSIONS = [
  'dashboard', 'stagiaires', 'formations', 'promotions', 'inscriptions',
  'reservations', 'affectations', 'seances', 'presences', 'evaluations', 'notes', 'qcm',
  'travaux', 'competences', 'implication', 'comportement', 'observations',
  'progression', 'plans', 'intermediate', 'journal', 'objectives', 'project',
  'final', 'bulletins', 'documents', 'reports', 'archive', 'notifications',
  'search', 'grade_validate', 'bulletin_publish',
  'users', 'settings', 'audit',
  'institution_settings', 'institution_users', 'institution_branding',
  'services', 'document_templates',
];

const PEDAGOGY_PERMISSIONS = [
  'dashboard', 'stagiaires', 'formations', 'promotions', 'inscriptions',
  'reservations', 'affectations', 'seances', 'presences', 'evaluations', 'notes', 'qcm',
  'travaux', 'competences', 'implication', 'comportement', 'observations',
  'progression', 'plans', 'intermediate', 'journal', 'objectives', 'project',
  'final', 'bulletins', 'documents', 'reports', 'notifications', 'search',
  'grade_validate', 'bulletin_publish',
  'services', 'document_templates',
];

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  supra_admin: ['*'],
  directeur: INSTITUTION_ADMIN_PERMISSIONS,
  admin_institution: INSTITUTION_ADMIN_PERMISSIONS,
  responsable_formation: PEDAGOGY_PERMISSIONS,
  responsable_pedagogique: PEDAGOGY_PERMISSIONS.filter(
    (permission) => permission !== 'bulletin_publish',
  ),
  formateur: [
    'dashboard', 'stagiaires', 'formations', 'promotions', 'seances',
    'presences', 'evaluations', 'notes', 'qcm', 'travaux', 'competences',
    'implication', 'comportement', 'observations', 'progression', 'plans',
    'journal', 'objectives', 'project', 'notifications', 'search',
  ],
  encadreur: [
    'dashboard', 'stagiaires', 'objectives', 'journal', 'competences',
    'implication', 'comportement', 'observations', 'project', 'notifications',
    'search',
  ],
  service_administratif: [
    'dashboard', 'stagiaires', 'inscriptions', 'reservations', 'affectations', 'documents',
    'notifications', 'search', 'archive', 'services', 'document_templates',
  ],
  stagiaire: [
    'dashboard',
    'self_dashboard', 'self_profile', 'self_formation', 'self_presences',
    'self_evaluations', 'self_notes', 'self_qcm', 'self_travaux',
    'self_competences', 'self_implication', 'self_comportement',
    'self_observations', 'self_progression', 'self_plans', 'self_journal',
    'self_objectives', 'self_project', 'self_bulletin', 'self_documents',
    'self_notifications', 'self_history', 'self_settings',
  ],
  rh: ['dashboard', 'stagiaires', 'reports', 'documents', 'notifications', 'search'],
  auditeur: ['dashboard', 'stagiaires', 'reports', 'audit', 'notifications', 'search'],

  admin: ['*'],
  direction: INSTITUTION_ADMIN_PERMISSIONS,
  administration: [
    'dashboard', 'stagiaires', 'inscriptions', 'reservations', 'affectations', 'documents',
    'notifications', 'search', 'archive', 'services', 'document_templates',
  ],
  maitre_stage: [
    'dashboard', 'stagiaires', 'objectives', 'journal', 'competences',
    'implication', 'comportement', 'observations', 'project', 'notifications',
    'search',
  ],
};

export function permissionsForRoles(roles: Role[]): string[] {
  const permissions = new Set<string>();
  roles.forEach((role) => {
    ROLE_PERMISSIONS[role]?.forEach((permission) => permissions.add(permission));
  });
  return Array.from(permissions);
}

export function hasPermission(permissions: string[], permission: string): boolean {
  return permissions.includes('*') || permissions.includes(permission);
}

export function isPlatformRole(role?: Role | null): boolean {
  return role === 'supra_admin' || role === 'admin';
}
