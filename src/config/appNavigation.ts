import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiArchive,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckSquare,
  FiClipboard,
  FiClock,
  FiDatabase,
  FiEdit3,
  FiFileText,
  FiFlag,
  FiFolder,
  FiGrid,
  FiInbox,
  FiLayers,
  FiList,
  FiLock,
  FiSearch,
  FiSettings,
  FiShield,
  FiTarget,
  FiTrendingUp,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';

export type AppNavItem = {
  label: string;
  path: string;
  icon: IconType;
  permission: string;
  end?: boolean;
};

export type AppNavGroup = {
  label: string;
  items: AppNavItem[];
};

export const appNavigation: AppNavGroup[] = [
  {
    label: 'Vue d’ensemble',
    items: [
      { label: 'Tableau de bord', path: '/app', icon: FiGrid, permission: 'dashboard', end: true },
      { label: 'Recherche globale', path: '/app/recherche', icon: FiSearch, permission: 'search' },
      { label: 'Notifications', path: '/app/notifications', icon: FiBell, permission: 'notifications' },
    ],
  },
  {
    label: 'Dossiers',
    items: [
      { label: 'Stagiaires', path: '/app/stagiaires', icon: FiUsers, permission: 'stagiaires' },
      { label: 'Inscriptions', path: '/app/inscriptions', icon: FiUserPlus, permission: 'inscriptions' },
      { label: 'Réservations', path: '/app/reservations', icon: FiInbox, permission: 'reservations' },
      { label: 'Affectations', path: '/app/affectations', icon: FiUserCheck, permission: 'affectations' },
    ],
  },
  {
    label: 'Pédagogie',
    items: [
      { label: 'Formations', path: '/app/formations', icon: FiBookOpen, permission: 'formations' },
      { label: 'Modules', path: '/app/modules', icon: FiLayers, permission: 'formations' },
      { label: 'Promotions', path: '/app/promotions', icon: FiCalendar, permission: 'promotions' },
      { label: 'Séances', path: '/app/seances', icon: FiClock, permission: 'seances' },
      { label: 'Présences', path: '/app/presences', icon: FiCheckSquare, permission: 'presences' },
    ],
  },
  {
    label: 'Évaluations',
    items: [
      { label: 'Évaluations', path: '/app/evaluations', icon: FiClipboard, permission: 'evaluations' },
      { label: 'Notes', path: '/app/notes', icon: FiEdit3, permission: 'notes' },
      { label: 'QCM', path: '/app/qcm', icon: FiList, permission: 'qcm' },
      { label: 'Travaux pratiques', path: '/app/travaux', icon: FiFolder, permission: 'travaux' },
      { label: 'Compétences', path: '/app/competences', icon: FiAward, permission: 'competences' },
      { label: 'Implication', path: '/app/implication', icon: FiActivity, permission: 'implication' },
      { label: 'Comportement', path: '/app/comportement', icon: FiShield, permission: 'comportement' },
    ],
  },
  {
    label: 'Suivi',
    items: [
      { label: 'Observations', path: '/app/observations', icon: FiEdit3, permission: 'observations' },
      { label: 'Progression', path: '/app/progression', icon: FiTrendingUp, permission: 'progression' },
      { label: 'Plans d’amélioration', path: '/app/plans', icon: FiTarget, permission: 'plans' },
      { label: 'Évaluations intermédiaires', path: '/app/evaluations-intermediaires', icon: FiBarChart2, permission: 'intermediate' },
      { label: 'Journal de stage', path: '/app/journal', icon: FiFileText, permission: 'journal' },
      { label: 'Objectifs de stage', path: '/app/objectifs', icon: FiFlag, permission: 'objectives' },
      { label: 'Projet final', path: '/app/projet-final', icon: FiBriefcase, permission: 'project' },
    ],
  },
  {
    label: 'Résultats',
    items: [
      { label: 'Évaluation finale', path: '/app/evaluation-finale', icon: FiAward, permission: 'final' },
      { label: 'Bulletins', path: '/app/bulletins', icon: FiFileText, permission: 'bulletins' },
      { label: 'Documents', path: '/app/documents', icon: FiFolder, permission: 'documents' },
      { label: 'Rapports & statistiques', path: '/app/rapports', icon: FiBarChart2, permission: 'reports' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Utilisateurs & rôles', path: '/app/utilisateurs', icon: FiLock, permission: 'users' },
      { label: 'Journal d’audit', path: '/app/audit', icon: FiDatabase, permission: 'audit' },
      { label: 'Paramètres', path: '/app/parametres', icon: FiSettings, permission: 'settings' },
      { label: 'Archivage', path: '/app/archivage', icon: FiArchive, permission: 'archive' },
    ],
  },
];
