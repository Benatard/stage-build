import type { ReactNode } from 'react';
import AccessDeniedPage from '@/pages/app/AccessDeniedPage';
import { useAuth } from '@/context/AuthContext';

export function PermissionRoute({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can } = useAuth();

  if (!can(permission)) {
    return <AccessDeniedPage />;
  }

  return <>{children}</>;
}
