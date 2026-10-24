import { Link } from 'react-router-dom';
import { FiArrowLeft, FiLock } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/config/permissions';

export default function AccessDeniedPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <span className="mb-5 flex h-16 w-16 items-center justify-center bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
        <FiLock className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-bold text-black dark:text-white">Accès refusé</h1>
      <p className="mt-2 max-w-md text-sm text-body dark:text-body-dark">
        Votre rôle{user ? ` (${ROLE_LABELS[user.role]})` : ''} ne dispose pas des permissions
        nécessaires pour consulter cette page.
      </p>
      <Link to="/app" className="mt-6">
        <Button variant="outline" icon={<FiArrowLeft className="h-4 w-4" />}>
          Retour au tableau de bord
        </Button>
      </Link>
    </div>
  );
}
