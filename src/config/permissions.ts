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
    'affectations', 'seances', 'presences', 'evaluations', 'notes', 'qcm',
    'travaux', 'competences', 'implication', 'comportement', 'observations',
    'progression', 'plans', 'intermediate', 'journal', 'objectives', 'project',
    'final', 'bulletins', 'documents', 'reports', 'archive', 'notifications',
    'search', 'grade_validate', 'bulletin_publish',
  ],
  responsable_formation: [
    'dashboard', 'stagiaires', 'formations', 'promotions', 'inscriptions',
    'affectations', 'seances', 'presences', 'evaluations', 'notes', 'qcm',
    'travaux', 'competences', 'implication', 'comportement', 'observations',
    'progression', 'plans', 'intermediate', 'journal', 'objectives', 'project',
    'final', 'bulletins', 'documents', 'reports', 'notifications', 'search',
    'grade_validate', 'bulletin_publish',
  ],
  responsable_pedagogique: [
    'dashboard', 'stagiaires', 'formations', 'promotions', 'inscriptions',
    'affectations', 'seances', 'presences', 'evaluations', 'notes', 'qcm',
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
    'dashboard', 'stagiaires', 'inscriptions', 'affectations', 'documents',
    'notifications', 'search', 'archive',
  ],
  stagiaire: [
    'dashboard', 'stagiaires', 'evaluations', 'notes', 'qcm', 'travaux',
    'competences', 'progression', 'observations', 'journal', 'objectives',
    'project', 'documents', 'bulletins', 'notifications', 'search',
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
