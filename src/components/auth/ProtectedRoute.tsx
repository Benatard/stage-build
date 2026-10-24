import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { FiLoader } from 'react-icons/fi';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfcfc] text-body dark:bg-[#121723] dark:text-body-dark">
        <FiLoader className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
