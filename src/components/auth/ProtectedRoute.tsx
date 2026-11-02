import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { useAuth } from '@/context/AuthContext';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#fcfcfc] px-4 py-16 dark:bg-[#121723] sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageSkeleton cards={6} />
        </div>
      </div>
    );
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
