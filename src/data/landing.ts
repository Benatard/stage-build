import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiAlertCircle,
  FiArchive,
  FiAward,
  FiBarChart2,
  FiBell,
  FiBook,
  FiBookOpen,
  FiBriefcase,
  FiCalendar,
  FiCheckCircle,
  FiCheckSquare,
  FiClipboard,
  FiClock,
  FiDatabase,
  FiEdit3,
  FiFileText,
  FiFlag,
  FiFolder,
  FiHash,
  FiHeart,
  FiLayers,
  FiList,
  FiLock,
  FiMessageSquare,
  FiSearch,
  FiShield,
  FiTarget,
  FiTool,
  FiTrendingUp,
  FiUserCheck,
  FiUserPlus,
  FiUsers,
} from 'react-icons/fi';

export type LandingStat = {
  value: string;
  label: string;
};

export type LandingPillar = {
  icon: IconType;
  title: string;
  description: string;
};

export type LifecycleStep = {
  step: string;
  title: string;
  description: string;
};

export type RoleProfile = {
  icon: IconType;
  role: string;
  description: string;
};

export type ModuleItem = {
  icon: IconType;
  title: string;
  description: string;
  points: string[];
};

export type ModuleGroup = {
  id: string;
  icon: IconType;
  label: string;
  title: string;
  description: string;
  modules: ModuleItem[];
};

export const landingStats: LandingStat[] = [
  { value: '8', label: 'domaines fonctionnels' },
  { value: '35', label: 'modules métier' },
  { value: '10', label: 'profils utilisateurs' },
  { value: '1', label: 'dossier centralisé' },
];

export const pillars: LandingPillar[] = [
  {
    icon: FiFolder,
    title: 'Un dossier unique par stagiaire',
    description:
      'Toutes les informations convergent vers un dossier central : identité, formation, présences, notes, compétences, observations et documents.',
  },
  {
    icon: FiTrendingUp,
    title: 'Un suivi individualisé continu',
    description:
      'Le système mesure la progression, détecte les difficultés et déclenche des plans d’amélioration avant que les écarts ne deviennent bloquants.',
  },
  {
    icon: FiBarChart2,
    title: 'Un pilotage fiable et traçable',
    description:
      'Direction, responsables et formateurs disposent de tableaux de bord, de rapports et d’un historique complet de chaque action.',
  },
];

export const lifecycleSteps: LifecycleStep[] = [
  {
    step: '01',
    title: 'Admission',
    description: 'Création du dossier, attribution du matricule et vérification des informations personnelles.',
  },
  {
    step: '02',
    title: 'Inscription',
    description: 'Rattachement à une formation, une promotion et un responsable pédagogique.',
  },
  {
    step: '03',
    title: 'Affectation',
    description: 'Attribution d’un groupe, d’un formateur référent et d’un maître de stage.',
  },
  {
    step: '04',
    title: 'Formation',
    description: 'Planification des séances, appel, suivi des modules et journal de stage.',
  },
  {
    step: '05',
    title: 'Évaluation',
    description: 'Notes, QCM, travaux pratiques, compétences, implication et comportement professionnel.',
  },
  {
    step: '06',
    title: 'Accompagnement',
    description: 'Détection des difficultés, observations, évaluations intermédiaires et plans d’amélioration.',
  },
  {
    step: '07',
    title: 'Validation',
    description: 'Projet final, évaluation finale, décision de validation et bulletin.',
  },
  {
    step: '08',
    title: 'Archivage',
    description: 'Documents, certificats, historique et conservation sécurisée du dossier.',
  },
];

export const roleProfiles: RoleProfile[] = [
  {
    icon: FiLock,
    role: 'Administrateur',
    description: 'Configure les comptes, les rôles, les permissions et les paramètres du système.',
  },
  {
    icon: FiUserPlus,
    role: 'Administration',
    description: 'Gère les dossiers, les inscriptions, les affectations et les documents administratifs.',
  },
  {
    icon: FiAward,
    role: 'Direction',
    description: 'Supervise l’ensemble, valide les résultats et publie les bulletins.',
  },
  {
    icon: FiUserCheck,
    role: 'Responsable pédagogique',
    description: 'Supervise les stagiaires, valide les notes et les évaluations, produit les rapports.',
  },
  {
    icon: FiBookOpen,
    role: 'Formateur',
    description: 'Conduit les séances, fait l’appel, crée les évaluations et saisit les notes.',
  },
  {
    icon: FiBriefcase,
    role: 'Maître de stage',
    description: 'Encadre le stagiaire, valide le journal, les objectifs et l’évaluation du stage.',
  },
  {
    icon: FiUsers,
    role: 'Stagiaire',
    description: 'Consulte sa progression, ses évaluations, ses documents et son bulletin final.',
  },
];

export const moduleGroups: ModuleGroup[] = [
  {
    id: 'administration',
    icon: FiShield,
    label: 'Administration',
    title: 'Comptes, rôles et sécurité',
    description:
      'Le socle technique qui protège les données et garantit que chaque utilisateur agit dans le périmètre de ses responsabilités.',
    modules: [
      {
        icon: FiLock,
        title: 'Comptes & accès',
        description: 'Création, activation, désactivation, blocage et réinitialisation des accès.',
        points: ['Créer et modifier un compte', 'Activer, désactiver ou bloquer', 'Réinitialiser un accès'],
      },
      {
        icon: FiShield,
        title: 'Rôles & permissions',
        description: 'Attribution des rôles et contrôle des permissions côté serveur.',
        points: ['Dix profils prédéfinis', 'Permissions par fonction', 'Contrôle des accès dans l’application'],
      },
      {
        icon: FiDatabase,
        title: 'Journal d’audit',
        description: 'Traçabilité des créations, modifications, validations et suppressions.',
        points: ['Historique des actions', 'Auteur et date de chaque opération', 'Traçabilité des validations'],
      },
      {
        icon: FiArchive,
        title: 'Archivage',
        description: 'Conservation des dossiers clôturés et des documents dans un espace dédié.',
        points: ['Archivage des dossiers', 'Consultation de l’historique', 'Restauration contrôlée'],
      },
    ],
  },
  {
    id: 'pedagogie',
    icon: FiBookOpen,
    label: 'Pédagogie',
    title: 'Formations, modules et promotions',
    description:
      'Structurez l’offre de formation, les contenus pédagogiques et les promotions qui accueillent les stagiaires.',
    modules: [
      {
        icon: FiBook,
        title: 'Formations',
        description: 'Création et gestion des parcours de formation complets.',
        points: ['Nom, description et objectifs', 'Durée, niveau et domaine', 'Programme et statut'],
      },
      {
        icon: FiLayers,
        title: 'Modules',
        description: 'Décomposition d’une formation en modules évaluables.',
        points: ['Coefficient et volume horaire', 'Formateur et compétences', 'Seuil de réussite et évaluations'],
      },
      {
        icon: FiCalendar,
        title: 'Promotions',
        description: 'Organisation des formations en promotions datées et suivies.',
        points: ['Création et modification', 'Clôture et archivage', 'Historique des promotions'],
      },
    ],
  },
  {
    id: 'dossiers',
    icon: FiFolder,
    label: 'Dossiers',
    title: 'Stagiaires, inscriptions et affectations',
    description:
      'De l’admission à l’affectation, le parcours administratif du stagiaire est structuré et vérifiable.',
    modules: [
      {
        icon: FiFolder,
        title: 'Dossier stagiaire',
        description: 'Le référentiel unique de toutes les informations du stagiaire.',
        points: ['Informations personnelles et parcours', 'Contacts et pièces administratives', 'Photo et données de suivi'],
      },
      {
        icon: FiHash,
        title: 'Matricule',
        description: 'Génération et suivi d’un identifiant unique pour chaque stagiaire.',
        points: ['Format contrôlé', 'Unicité garantie', 'Utilisation dans tous les documents'],
      },
      {
        icon: FiUserPlus,
        title: 'Inscriptions',
        description: 'Rattachement du stagiaire à une formation et à une promotion.',
        points: ['Dates de début et de fin', 'Responsable du dossier', 'Statut de l’inscription'],
      },
      {
        icon: FiBriefcase,
        title: 'Affectations',
        description: 'Répartition des stagiaires par groupe, service et encadrement.',
        points: ['Formateur référent', 'Maître de stage', 'Groupe et service'],
      },
    ],
  },
  {
    id: 'presences',
    icon: FiCheckSquare,
    label: 'Présences',
    title: 'Séances, appels et assiduité',
    description:
      'Le suivi quotidien des présences alimente automatiquement les indicateurs d’assiduité du stagiaire.',
    modules: [
      {
        icon: FiClock,
        title: 'Séances',
        description: 'Planification des cours et des activités pédagogiques.',
        points: ['Date, horaire et salle', 'Module et formateur', 'Statut de la séance'],
      },
      {
        icon: FiCheckSquare,
        title: 'Appel',
        description: 'Enregistrement rapide des présences pour chaque séance.',
        points: ['Présent, absent ou retard', 'Absence justifiée', 'Sortie autorisée'],
      },
      {
        icon: FiAlertCircle,
        title: 'Retards & absences',
        description: 'Consolidation des écarts d’assiduité et alertes associées.',
        points: ['Cumul des retards et absences', 'Taux de présence', 'Seuils d’alerte'],
      },
    ],
  },
  {
    id: 'evaluations',
    icon: FiClipboard,
    label: 'Évaluations',
    title: 'Notes, QCM et travaux pratiques',
    description:
      'Toutes les formes d’évaluation sont prises en charge et alimentent le carnet de notes selon des règles configurables.',
    modules: [
      {
        icon: FiClipboard,
        title: 'Évaluations',
        description: 'Création d’interrogations, devoirs, examens, projets et évaluations finales.',
        points: ['Type, date et barème', 'Coefficient et pondération', 'Statut et publication'],
      },
      {
        icon: FiEdit3,
        title: 'Notes & carnet',
        description: 'Saisie, validation et consultation centralisées des notes.',
        points: ['Saisie par évaluation', 'Validation des notes', 'Moyennes pondérées'],
      },
      {
        icon: FiList,
        title: 'QCM',
        description: 'Création et passation de questionnaires à choix multiples.',
        points: ['Questions et options', 'Correction automatique', 'Résultats et tentatives'],
      },
      {
        icon: FiTool,
        title: 'Travaux pratiques',
        description: 'Publication de TP, dépôt des livrables et correction.',
        points: ['Consignes et échéances', 'Dépôt des travaux', 'Notes et feedback'],
      },
    ],
  },
  {
    id: 'suivi',
    icon: FiTrendingUp,
    label: 'Suivi',
    title: 'Compétences et progression',
    description:
      'Au-delà des notes, le système évalue les compétences, l’implication et le comportement professionnel.',
    modules: [
      {
        icon: FiAward,
        title: 'Compétences',
        description: 'Suivi du niveau acquis pour chaque compétence du référentiel.',
        points: ['Non acquis à maîtrisé', 'Commentaire du formateur', 'Dernier niveau connu'],
      },
      {
        icon: FiActivity,
        title: 'Implication',
        description: 'Évaluation de la participation et de l’engagement en formation.',
        points: ['Participation et assiduité', 'Curiosité et autonomie', 'Travail personnel'],
      },
      {
        icon: FiHeart,
        title: 'Comportement',
        description: 'Évaluation du professionnalisme et du savoir-être.',
        points: ['Ponctualité et discipline', 'Respect et communication', 'Esprit d’équipe'],
      },
      {
        icon: FiMessageSquare,
        title: 'Observations',
        description: 'Notes qualitatives tracées et rattachées au dossier.',
        points: ['Observations internes ou publiées', 'Lien avec module ou séance', 'Auteur identifié'],
      },
      {
        icon: FiTrendingUp,
        title: 'Progression',
        description: 'Vision consolidée de l’évolution du stagiaire dans le temps.',
        points: ['Historique des notes', 'Taux de présence', 'Compétences acquises'],
      },
      {
        icon: FiTarget,
        title: 'Plans d’amélioration',
        description: 'Actions ciblées pour remédier aux difficultés détectées.',
        points: ['Difficulté et objectif', 'Actions et responsables', 'Suivi et évaluation du plan'],
      },
    ],
  },
  {
    id: 'finalisation',
    icon: FiBriefcase,
    label: 'Stage & finalisation',
    title: 'Du journal de stage au bulletin',
    description:
      'Les objectifs, le projet final et l’évaluation finale aboutissent à un bulletin et à des documents officiels.',
    modules: [
      {
        icon: FiFileText,
        title: 'Journal de stage',
        description: 'Consignation quotidienne des activités et compétences mobilisées.',
        points: ['Activité et durée', 'Compétence travaillée', 'Validation par l’encadreur'],
      },
      {
        icon: FiFlag,
        title: 'Objectifs de stage',
        description: 'Définition et validation des objectifs individuels.',
        points: ['Objectifs et description', 'Statut d’atteinte', 'Commentaire de validation'],
      },
      {
        icon: FiBriefcase,
        title: 'Projet final',
        description: 'Encadrement du projet de fin de formation et de sa soutenance.',
        points: ['Objectifs et livrables', 'Superviseur et jury', 'Note et appréciation'],
      },
      {
        icon: FiCheckCircle,
        title: 'Évaluation finale',
        description: 'Consolidation des moyennes et décision de validation.',
        points: ['Moyennes par catégorie', 'Coefficients', 'Décision finale'],
      },
      {
        icon: FiFileText,
        title: 'Bulletin',
        description: 'Génération et publication du bulletin de fin de formation.',
        points: ['Contenu structuré', 'Validation avant publication', 'Version publiable'],
      },
      {
        icon: FiFolder,
        title: 'Documents',
        description: 'Production des documents administratifs du stagiaire.',
        points: ['Attestation et certificat', 'Relevé de notes', 'Fiche d’évaluation'],
      },
      {
        icon: FiUsers,
        title: 'Maître de stage',
        description: 'Espace dédié à l’encadrement en entreprise.',
        points: ['Suivi des objectifs', 'Validation du journal', 'Évaluation du stage'],
      },
    ],
  },
  {
    id: 'pilotage',
    icon: FiBarChart2,
    label: 'Pilotage',
    title: 'Tableaux de bord et décision',
    description:
      'Des indicateurs consolidés pour suivre l’activité, anticiper les difficultés et produire les rapports attendus.',
    modules: [
      {
        icon: FiBarChart2,
        title: 'Tableaux de bord',
        description: 'Vue synthétique adaptée au rôle de chaque utilisateur.',
        points: ['Indicateurs clés', 'Alertes et priorités', 'Accès rapides'],
      },
      {
        icon: FiTrendingUp,
        title: 'Rapports & statistiques',
        description: 'Analyse des résultats, de l’assiduité et des tendances.',
        points: ['Taux de réussite', 'Moyennes et présence', 'Export des données'],
      },
      {
        icon: FiSearch,
        title: 'Recherche',
        description: 'Accès rapide à un stagiaire, une formation ou un document.',
        points: ['Recherche transversale', 'Filtres par statut', 'Accès direct au dossier'],
      },
      {
        icon: FiBell,
        title: 'Notifications',
        description: 'Information des utilisateurs sur les événements importants.',
        points: ['Échéances et résultats', 'Affectations et présences', 'Notifications internes'],
      },
    ],
  },
];
