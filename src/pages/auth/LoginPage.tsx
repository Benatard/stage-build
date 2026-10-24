import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiLock, FiMail, FiShield } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Form';
import { company } from '@/config/site';
import { useAuth } from '@/context/AuthContext';
import { isForgeConfigured } from '@/config/env';
import { getErrorMessage } from '@/utils/format';

type LocationState = {
  from?: { pathname?: string };
};

export default function LoginPage() {
  const { login, status, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const from = (location.state as LocationState | null)?.from?.pathname ?? '/app';

  useEffect(() => {
    if (status === 'authenticated' && user) {
      navigate(from, { replace: true });
    }
  }, [status, user, navigate, from]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (loginError) {
      setError(getErrorMessage(loginError, 'Identifiants invalides.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#121723]">
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-[#0E1526] p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />

        <Link to="/" className="relative flex items-center gap-3">
          <img src="/images/logo-mark.svg" alt={company.name} className="h-11 w-11" />
          <span className="text-xl font-extrabold tracking-tight">
            FLASH<span className="text-primary">EMPIRE</span>
          </span>
        </Link>

        <div className="relative max-w-md">
          <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-light">
            <FiShield className="h-3.5 w-3.5" />
            Espace sécurisé
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight">
            Gestion et suivi des stagiaires
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/60">
            Centralisez les dossiers, les évaluations, les présences et les bulletins dans une
            plateforme unique conçue pour les équipes pédagogiques et administratives.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/70">
            {[
              'Suivi individualisé de chaque stagiaire',
              'Évaluations, QCM, travaux pratiques et compétences',
              'Bulletins, documents et rapports automatisés',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-primary-light">
                  <FiArrowRight className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} {company.legal}. Tous droits réservés.
        </p>
      </div>

      <div className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-[54%] lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link
            to="/"
            className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-body transition-colors hover:text-primary dark:text-body-dark"
          >
            <FiArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/images/logo-mark.svg" alt={company.name} className="h-9 w-9" />
            <span className="text-lg font-extrabold tracking-tight text-black dark:text-white">
              STAGE<span className="text-primary">BUILD</span>
            </span>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
            Portail Stage Build
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-white">
            Connexion
          </h2>
          <p className="mt-2 text-sm text-body dark:text-body-dark">
            Accédez à votre espace selon votre rôle et vos permissions.
          </p>

          {!isForgeConfigured && (
            <div className="mt-6 border border-amber-300 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
              Forge Console n’est pas encore configuré. Renseignez les variables
              <code className="mx-1 bg-amber-100 px-1 dark:bg-amber-500/20">VITE_FORGE_PROJECT_KEY</code>
              et
              <code className="mx-1 bg-amber-100 px-1 dark:bg-amber-500/20">VITE_FORGE_API_KEY</code>
              dans <code>.env.local</code>.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Field label="Adresse email" required>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
                <Input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="vous@exemple.com"
                  className="pl-10"
                />
              </div>
            </Field>

            <Field label="Mot de passe" required>
              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
                <Input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  className="pl-10"
                />
              </div>
            </Field>

            {error && (
              <div className="border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={submitting || status === 'loading'}
              className="w-full"
            >
              Se connecter
              <FiArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-body dark:text-body-dark">
            Vos identifiants sont fournis par l’administration.
          </p>
        </div>
      </div>
    </div>
  );
}
