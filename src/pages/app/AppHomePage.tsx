import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import DashboardPage from './DashboardPage';
import PlatformDashboardPage from './platform/PlatformDashboardPage';

export default function AppHomePage() {
  const { user, isPlatformMode } = useAuth();

  if (user?.role === 'stagiaire') {
    return <Navigate to="/app/mon-espace" replace />;
  }

  if (isPlatformMode) {
    return <PlatformDashboardPage />;
  }

  return <DashboardPage />;
}
