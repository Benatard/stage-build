import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import DashboardPage from './DashboardPage';

export default function AppHomePage() {
  const { user } = useAuth();

  if (user?.role === 'stagiaire') {
    return <Navigate to="/app/mon-espace" replace />;
  }

  return <DashboardPage />;
}
