import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PermissionRoute } from '@/components/auth/PermissionRoute';
import AppLayout from '@/components/layout/AppLayout';
import MainLayout from '@/components/layout/MainLayout';
import AccessDeniedPage from '@/pages/app/AccessDeniedPage';
import AffectationsPage from '@/pages/app/AffectationsPage';
import AppHomePage from '@/pages/app/AppHomePage';
import ArchivagePage from '@/pages/app/ArchivagePage';
import AuditPage from '@/pages/app/AuditPage';
import BulletinsPage from '@/pages/app/BulletinsPage';
import CompetencesPage from '@/pages/app/CompetencesPage';
import ComportementPage from '@/pages/app/ComportementPage';
import DocumentsPage from '@/pages/app/DocumentsPage';
import EvaluationFinalePage from '@/pages/app/EvaluationFinalePage';
import EvaluationsIntermediairesPage from '@/pages/app/EvaluationsIntermediairesPage';
import EvaluationsPage from '@/pages/app/EvaluationsPage';
import FormationsPage from '@/pages/app/FormationsPage';
import ImplicationPage from '@/pages/app/ImplicationPage';
import InscriptionsPage from '@/pages/app/InscriptionsPage';
import JournalPage from '@/pages/app/JournalPage';
import ReservationsPage from '@/pages/app/ReservationsPage';
import ModulesPage from '@/pages/app/ModulesPage';
import NotesPage from '@/pages/app/NotesPage';
import NotificationsPage from '@/pages/app/NotificationsPage';
import ObjectifsPage from '@/pages/app/ObjectifsPage';
import ObservationsPage from '@/pages/app/ObservationsPage';
import PlansPage from '@/pages/app/PlansPage';
import PresencesPage from '@/pages/app/PresencesPage';
import ProgressionPage from '@/pages/app/ProgressionPage';
import ProjetFinalPage from '@/pages/app/ProjetFinalPage';
import PromotionsPage from '@/pages/app/PromotionsPage';
import QcmPage from '@/pages/app/QcmPage';
import QcmPassationPage from '@/pages/app/QcmPassationPage';
import RapportsPage from '@/pages/app/RapportsPage';
import SearchPage from '@/pages/app/SearchPage';
import SeancesPage from '@/pages/app/SeancesPage';
import SettingsPage from '@/pages/app/SettingsPage';
import StagiaireDetailPage from '@/pages/app/StagiaireDetailPage';
import StagiairesPage from '@/pages/app/StagiairesPage';
import TravauxPage from '@/pages/app/TravauxPage';
import UsersPage from '@/pages/app/UsersPage';
import LoginPage from '@/pages/auth/LoginPage';
import ForgeStatusPage from '@/pages/ForgeStatusPage';
import HomePage from '@/pages/HomePage';
import NotFoundPage from '@/pages/NotFoundPage';
import ReservationPage from '@/pages/ReservationPage';
import {
  StagiaireJournal,
  StagiaireNotifications,
  StagiaireQcm,
  StagiaireTravaux,
} from '@/pages/app/stagiaire/StagiaireActivities';
import StagiaireCompetences from '@/pages/app/stagiaire/StagiaireCompetences';
import StagiaireDashboard from '@/pages/app/stagiaire/StagiaireDashboard';
import StagiaireEvaluations from '@/pages/app/stagiaire/StagiaireEvaluations';
import StagiaireFormation from '@/pages/app/stagiaire/StagiaireFormation';
import StagiaireNotes from '@/pages/app/stagiaire/StagiaireNotes';
import StagiairePresences from '@/pages/app/stagiaire/StagiairePresences';
import StagiaireProfile from '@/pages/app/stagiaire/StagiaireProfile';
import StagiaireProgression from '@/pages/app/stagiaire/StagiaireProgression';
import {
  StagiaireBulletin,
  StagiaireDocuments,
  StagiaireHistory,
} from '@/pages/app/stagiaire/StagiaireResults';
import StagiaireSettings from '@/pages/app/stagiaire/StagiaireSettings';
import {
  StagiaireComportement,
  StagiaireImplication,
  StagiaireObjectives,
  StagiaireObservations,
  StagiairePlans,
  StagiaireProject,
} from '@/pages/app/stagiaire/StagiaireSupport';

const publicRoutes: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'reservation', element: <ReservationPage /> },
  { path: 'forge', element: <ForgeStatusPage /> },
  { path: '*', element: <NotFoundPage /> },
];

const appRoutes: RouteObject[] = [
  { index: true, element: <AppHomePage /> },
  {
    path: 'mon-espace',
    children: [
      {
        index: true,
        element: (
          <PermissionRoute permission="self_dashboard">
            <StagiaireDashboard />
          </PermissionRoute>
        ),
      },
      {
        path: 'profil',
        element: (
          <PermissionRoute permission="self_profile">
            <StagiaireProfile />
          </PermissionRoute>
        ),
      },
      {
        path: 'formation',
        element: (
          <PermissionRoute permission="self_formation">
            <StagiaireFormation />
          </PermissionRoute>
        ),
      },
      {
        path: 'notifications',
        element: (
          <PermissionRoute permission="self_notifications">
            <StagiaireNotifications />
          </PermissionRoute>
        ),
      },
      {
        path: 'presences',
        element: (
          <PermissionRoute permission="self_presences">
            <StagiairePresences />
          </PermissionRoute>
        ),
      },
      {
        path: 'evaluations',
        element: (
          <PermissionRoute permission="self_evaluations">
            <StagiaireEvaluations />
          </PermissionRoute>
        ),
      },
      {
        path: 'notes',
        element: (
          <PermissionRoute permission="self_notes">
            <StagiaireNotes />
          </PermissionRoute>
        ),
      },
      {
        path: 'qcm',
        element: (
          <PermissionRoute permission="self_qcm">
            <StagiaireQcm />
          </PermissionRoute>
        ),
      },
      {
        path: 'travaux',
        element: (
          <PermissionRoute permission="self_travaux">
            <StagiaireTravaux />
          </PermissionRoute>
        ),
      },
      {
        path: 'competences',
        element: (
          <PermissionRoute permission="self_competences">
            <StagiaireCompetences />
          </PermissionRoute>
        ),
      },
      {
        path: 'implication',
        element: (
          <PermissionRoute permission="self_implication">
            <StagiaireImplication />
          </PermissionRoute>
        ),
      },
      {
        path: 'comportement',
        element: (
          <PermissionRoute permission="self_comportement">
            <StagiaireComportement />
          </PermissionRoute>
        ),
      },
      {
        path: 'observations',
        element: (
          <PermissionRoute permission="self_observations">
            <StagiaireObservations />
          </PermissionRoute>
        ),
      },
      {
        path: 'progression',
        element: (
          <PermissionRoute permission="self_progression">
            <StagiaireProgression />
          </PermissionRoute>
        ),
      },
      {
        path: 'plans',
        element: (
          <PermissionRoute permission="self_plans">
            <StagiairePlans />
          </PermissionRoute>
        ),
      },
      {
        path: 'journal',
        element: (
          <PermissionRoute permission="self_journal">
            <StagiaireJournal />
          </PermissionRoute>
        ),
      },
      {
        path: 'objectifs',
        element: (
          <PermissionRoute permission="self_objectives">
            <StagiaireObjectives />
          </PermissionRoute>
        ),
      },
      {
        path: 'projet-final',
        element: (
          <PermissionRoute permission="self_project">
            <StagiaireProject />
          </PermissionRoute>
        ),
      },
      {
        path: 'bulletin',
        element: (
          <PermissionRoute permission="self_bulletin">
            <StagiaireBulletin />
          </PermissionRoute>
        ),
      },
      {
        path: 'documents',
        element: (
          <PermissionRoute permission="self_documents">
            <StagiaireDocuments />
          </PermissionRoute>
        ),
      },
      {
        path: 'historique',
        element: (
          <PermissionRoute permission="self_history">
            <StagiaireHistory />
          </PermissionRoute>
        ),
      },
      {
        path: 'parametres',
        element: (
          <PermissionRoute permission="self_settings">
            <StagiaireSettings />
          </PermissionRoute>
        ),
      },
    ],
  },
  {
    path: 'stagiaires',
    element: (
      <PermissionRoute permission="stagiaires">
        <StagiairesPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'stagiaires/:id',
    element: (
      <PermissionRoute permission="stagiaires">
        <StagiaireDetailPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'inscriptions',
    element: (
      <PermissionRoute permission="inscriptions">
        <InscriptionsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'reservations',
    element: (
      <PermissionRoute permission="reservations">
        <ReservationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'affectations',
    element: (
      <PermissionRoute permission="affectations">
        <AffectationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'formations',
    element: (
      <PermissionRoute permission="formations">
        <FormationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'modules',
    element: (
      <PermissionRoute permission="formations">
        <ModulesPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'promotions',
    element: (
      <PermissionRoute permission="promotions">
        <PromotionsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'seances',
    element: (
      <PermissionRoute permission="seances">
        <SeancesPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'presences',
    element: (
      <PermissionRoute permission="presences">
        <PresencesPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'evaluations',
    element: (
      <PermissionRoute permission="evaluations">
        <EvaluationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'notes',
    element: (
      <PermissionRoute permission="notes">
        <NotesPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'qcm',
    element: (
      <PermissionRoute permission="qcm">
        <QcmPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'qcm/:evaluationId/passer',
    element: (
      <PermissionRoute permission="qcm">
        <QcmPassationPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'travaux',
    element: (
      <PermissionRoute permission="travaux">
        <TravauxPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'competences',
    element: (
      <PermissionRoute permission="competences">
        <CompetencesPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'implication',
    element: (
      <PermissionRoute permission="implication">
        <ImplicationPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'comportement',
    element: (
      <PermissionRoute permission="comportement">
        <ComportementPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'observations',
    element: (
      <PermissionRoute permission="observations">
        <ObservationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'progression',
    element: (
      <PermissionRoute permission="progression">
        <ProgressionPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'plans',
    element: (
      <PermissionRoute permission="plans">
        <PlansPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'evaluations-intermediaires',
    element: (
      <PermissionRoute permission="intermediate">
        <EvaluationsIntermediairesPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'journal',
    element: (
      <PermissionRoute permission="journal">
        <JournalPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'objectifs',
    element: (
      <PermissionRoute permission="objectives">
        <ObjectifsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'projet-final',
    element: (
      <PermissionRoute permission="project">
        <ProjetFinalPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'evaluation-finale',
    element: (
      <PermissionRoute permission="final">
        <EvaluationFinalePage />
      </PermissionRoute>
    ),
  },
  {
    path: 'bulletins',
    element: (
      <PermissionRoute permission="bulletins">
        <BulletinsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'documents',
    element: (
      <PermissionRoute permission="documents">
        <DocumentsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'rapports',
    element: (
      <PermissionRoute permission="reports">
        <RapportsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'utilisateurs',
    element: (
      <PermissionRoute permission="users">
        <UsersPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'audit',
    element: (
      <PermissionRoute permission="audit">
        <AuditPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'parametres',
    element: (
      <PermissionRoute permission="settings">
        <SettingsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'archivage',
    element: (
      <PermissionRoute permission="archive">
        <ArchivagePage />
      </PermissionRoute>
    ),
  },
  {
    path: 'notifications',
    element: (
      <PermissionRoute permission="notifications">
        <NotificationsPage />
      </PermissionRoute>
    ),
  },
  {
    path: 'recherche',
    element: (
      <PermissionRoute permission="search">
        <SearchPage />
      </PermissionRoute>
    ),
  },
  { path: 'acces-refuse', element: <AccessDeniedPage /> },
  { path: '*', element: <NotFoundPage /> },
];

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: publicRoutes,
  },
  { path: '/login', element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/app',
        element: <AppLayout />,
        children: appRoutes,
      },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
