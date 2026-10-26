import type { Role } from '@/types/domain';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur système',
  direction: 'Direction',
  responsable_formation: 'Responsable de formation',
  responsable_pedagogique: 'Responsable pédagogique',
  formateur: 'Formateur',
  maitre_stage: 'Maître de stage',
  administration: 'Service administratif',
  stagiaire: 'Stagiaire',
  rh: 'Ressources humaines',
  auditeur: 'Auditeur / Superviseur',
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({
  value: value as Role,
  label,
}));

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: ['*'],
  direction: [
    'dashboard', 'stagiaires', 'formations', 'promotions', 'inscriptions',
    'reservations', 'affectations', 'seances', 'presences', 'evaluations', 'notes', 'qcm',
    'travaux', 'competences', 'implication', 'comportement', 'observations',
    'progression', 'plans', 'intermediate', 'journal', 'objectives', 'project',
    'final', 'bulletins', 'documents', 'reports', 'archive', 'notifications',
    'search', 'grade_validate', 'bulletin_publish',
  ],
  responsable_formation: [
    'dashboard', 'stagiaires', 'formations', 'promotions', 'inscriptions',
    'reservations', 'affectations', 'seances', 'presences', 'evaluations', 'notes', 'qcm',
    'travaux', 'competences', 'implication', 'comportement', 'observations',
    'progression', 'plans', 'intermediate', 'journal', 'objectives', 'project',
    'final', 'bulletins', 'documents', 'reports', 'notifications', 'search',
    'grade_validate', 'bulletin_publish',
  ],
  responsable_pedagogique: [
    'dashboard', 'stagiaires', 'formations', 'promotions', 'inscriptions',
    'reservations', 'affectations', 'seances', 'presences', 'evaluations', 'notes', 'qcm',
    'travaux', 'competences', 'implication', 'comportement', 'observations',
    'progression', 'plans', 'intermediate', 'journal', 'objectives', 'project',
    'final', 'bulletins', 'documents', 'reports', 'notifications', 'search',
    'grade_validate',
  ],
  formateur: [
    'dashboard', 'stagiaires', 'formations', 'promotions', 'seances',
    'presences', 'evaluations', 'notes', 'qcm', 'travaux', 'competences',
    'implication', 'comportement', 'observations', 'progression', 'plans',
    'journal', 'objectives', 'project', 'notifications', 'search',
  ],
  maitre_stage: [
    'dashboard', 'stagiaires', 'objectives', 'journal', 'competences',
    'implication', 'comportement', 'observations', 'project', 'notifications',
    'search',
  ],
  administration: [
    'dashboard', 'stagiaires', 'inscriptions', 'reservations', 'affectations', 'documents',
    'notifications', 'search', 'archive',
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
