import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiLock } from 'react-icons/fi';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { publicAnchors } from '@/config/navigation';
import { company } from '@/config/site';

const coverage = [
  'Dossiers stagiaires',
  'Formations & promotions',
  'Présences & assiduité',
  'Évaluations, notes & QCM',
  'Compétences & plans d’amélioration',
  'Bulletins, documents & rapports',
];

export function Footer() {
  return (
    <footer className="relative bg-white dark:bg-gray-dark">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="page-container pb-8 pt-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link to="/" className="inline-flex">
              <BrandLogo className="h-11 w-auto" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-body dark:text-body-dark">
              {company.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {['Dossier unique', 'Permissions par rôle', 'Historique complet'].map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1.5 bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold text-primary"
                >
                  <FiCheckCircle className="h-3 w-3" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-black dark:text-white">
              Plateforme
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-body dark:text-body-dark">
              <li>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 transition-all duration-300 hover:translate-x-0.5 hover:text-primary"
                >
                  <span className="h-1 w-1 bg-primary/40" />
                  Accueil
                </Link>
              </li>
              {publicAnchors.map((anchor) => (
                <li key={anchor.href}>
                  <a
                    href={anchor.href}
                    className="inline-flex items-center gap-2 transition-all duration-300 hover:translate-x-0.5 hover:text-primary"
                  >
                    <span className="h-1 w-1 bg-primary/40" />
                    {anchor.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-black dark:text-white">
              Couverture
            </h3>
            <ul className="mt-5 space-y-3 text-sm text-body dark:text-body-dark">
              {coverage.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 bg-primary/40" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-black dark:text-white">
              Accès
            </h3>
            <div className="mt-5 border border-stroke bg-gray2 p-5 dark:border-white/10 dark:bg-white/5">
              <span className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary">
                <FiLock className="h-4 w-4" />
              </span>
              <p className="mt-4 text-sm font-bold text-black dark:text-white">Espace sécurisé</p>
              <p className="mt-1.5 text-xs leading-relaxed text-body dark:text-body-dark">
                Connectez-vous avec le compte fourni par l’administration pour accéder à votre
                périmètre.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                Se connecter <FiArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-stroke/70 pt-7 dark:border-[#2C303B] md:flex-row">
          <p className="text-sm text-body dark:text-body-dark">
            &copy; {new Date().getFullYear()} {company.legal}. Gestion et suivi des stagiaires.
          </p>
          <div className="flex items-center gap-6 text-sm text-body dark:text-body-dark">
            <span>React · Vite · Forge Console</span>
            <Link to="/forge" className="transition-colors hover:text-primary">
              État de la connexion
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
