import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { PageMeta } from '@/components/ui/PageMeta';

export default function NotFoundPage() {
  return (
    <div className="page-container py-24 text-center">
      <PageMeta title="Page non trouvée" />
      <p className="text-sm font-semibold uppercase tracking-widest text-primary">Erreur 404</p>
      <h1 className="mt-4 text-4xl md:text-5xl font-extrabold text-black dark:text-white">
        Page non trouvée
      </h1>
      <p className="mt-4 text-body dark:text-body-dark">
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="btn-primary-root mt-8">
        <FiArrowLeft className="w-4 h-4" /> Retour à l'accueil
      </Link>
    </div>
  );
}
