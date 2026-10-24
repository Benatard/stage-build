import {
  FiAlertCircle,
  FiCheckCircle,
  FiDatabase,
  FiKey,
  FiRefreshCw,
  FiServer,
} from 'react-icons/fi';
import { PageMeta } from '@/components/ui/PageMeta';
import { Reveal } from '@/components/ui/Reveal';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { forgeConfig, isForgeConfigured } from '@/config/env';
import { useForgeConnection, type ForgeConnectionState } from '@/hooks/useForgeConnection';
import { maskSecret } from '@/utils/mask';

const stateStyles: Record<ForgeConnectionState, string> = {
  idle: 'bg-white/70 text-dark dark:bg-[#2C303B] dark:text-body-dark',
  checking: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  error: 'bg-red-500/10 text-red-600 dark:text-red-300',
};

const stateLabels: Record<ForgeConnectionState, string> = {
  idle: 'En attente',
  checking: 'Connexion...',
  success: 'Connecté',
  error: 'Erreur',
};

const configuration = [
  {
    icon: FiServer,
    label: 'URL de l’API',
    value: forgeConfig.apiUrl,
  },
  {
    icon: FiKey,
    label: 'Clé de projet',
    value: forgeConfig.projectKey || 'non définie',
  },
  {
    icon: FiKey,
    label: 'Clé API',
    value: maskSecret(forgeConfig.apiKey),
  },
  {
    icon: FiDatabase,
    label: 'Tables',
    value: `${forgeConfig.tables.contact}, ${forgeConfig.tables.newsletter}`,
  },
];

export default function ForgeStatusPage() {
  const { state, message, testConnection } = useForgeConnection();

  return (
    <div>
      <PageMeta
        title="Forge Console"
        description="Diagnostic de connexion à l’API Forge Console et à ses endpoints REST."
      />

      <section className="relative overflow-hidden bg-white dark:bg-gray-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(74,108,247,0.12)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)] pointer-events-none" />
        <div className="absolute -top-40 -right-32 w-[480px] h-[480px] bg-primary/15 blur-3xl pointer-events-none" />
        <div className="page-container relative py-20 md:py-24">
          <Reveal className="max-w-[760px] mx-auto text-center">
            <span className="eyebrow-root">
              <span className="h-1.5 w-1.5 bg-primary inline-block" />
              Environnement API
            </span>
            <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-black dark:text-white">
              Forge Console{' '}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                prêt à être connecté
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-body dark:text-body-dark max-w-[640px] mx-auto">
              Le client HTTP, l’authentification, la gestion du jeton et les opérations CRUD sont
              déjà en place. Vérifiez la connexion à votre projet Forge ci-dessous.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#161B24]">
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Diagnostic"
            title="Connexion au projet"
            sub="La requête de test exécute « select 1 as ok » sur le endpoint SQL de votre projet Forge."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Reveal>
              <div className="card-root p-8 h-full">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-black dark:text-white">Paramètres</h2>
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold ${
                      isForgeConfigured
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    }`}
                  >
                    {isForgeConfigured ? (
                      <FiCheckCircle className="w-3.5 h-3.5" />
                    ) : (
                      <FiAlertCircle className="w-3.5 h-3.5" />
                    )}
                    {isForgeConfigured ? 'Configuré' : 'À configurer'}
                  </span>
                </div>

                <dl className="mt-6 space-y-4">
                  {configuration.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-4">
                      <span className="h-10 w-10 bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </span>
                      <div className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-widest text-body dark:text-body-dark">
                          {label}
                        </dt>
                        <dd className="mt-0.5 text-sm font-semibold text-dark dark:text-white break-all">
                          {value}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="card-root p-8 h-full flex flex-col">
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-lg font-bold text-black dark:text-white">Test de connexion</h2>
                  <span
                    className={`px-3 py-1.5 text-xs font-semibold ${stateStyles[state]}`}
                  >
                    {stateLabels[state]}
                  </span>
                </div>

                <div className="mt-6 flex-1 bg-[#0F1420] p-5 font-mono text-xs leading-relaxed text-[#B9C4DA] overflow-x-auto">
                  <p className="text-[#6F7D95]">// Requête exécutée</p>
                  <p className="mt-2">
                    <span className="text-[#7C93FF]">POST</span>{' '}
                    {forgeConfig.apiUrl}/{forgeConfig.projectKey || ':projectKey'}/sql
                  </p>
                  <p className="mt-3 text-[#6F7D95]">// En-têtes</p>
                  <p className="mt-2">x-api-key: {maskSecret(forgeConfig.apiKey)}</p>
                  <p>content-type: application/json</p>
                  <p className="mt-3 text-[#6F7D95]">// Corps</p>
                  <p className="mt-2">{'{ "sql": "select 1 as ok" }'}</p>
                </div>

                {message && (
                  <p
                    className={`mt-6 text-sm ${
                      state === 'success'
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-red-600 dark:text-red-300'
                    }`}
                  >
                    {message}
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => void testConnection()}
                  disabled={state === 'checking'}
                  className="btn-primary-root mt-6 w-full disabled:opacity-60"
                >
                  <FiRefreshCw
                    className={`w-4 h-4 ${state === 'checking' ? 'animate-spin' : ''}`}
                  />
                  {state === 'checking' ? 'Test en cours...' : 'Tester la connexion'}
                </button>
              </div>
            </Reveal>
          </div>

          <Reveal delay={180}>
            <div className="mt-6 card-root p-8">
              <h2 className="text-lg font-bold text-black dark:text-white">
                Ce qui est déjà prêt
              </h2>
              <ul className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-body dark:text-body-dark">
                {[
                  'Client Axios configuré avec la clé x-api-key',
                  'Jeton JWT end-user injecté automatiquement',
                  'CRUD générique : list, find, create, update, delete',
                  'Endpoints GraphQL et SQL typés',
                  'Authentification signup, login et me',
                  'Tables contact et newsletter reliées aux formulaires',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FiCheckCircle className="w-3 h-3 text-primary" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
