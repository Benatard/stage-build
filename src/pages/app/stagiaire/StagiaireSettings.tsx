import { Link } from 'react-router-dom';
import { FiDownload, FiMoon, FiShield, FiSun, FiUser } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Feedback';
import { ROLE_LABELS } from '@/config/permissions';
import { STAGIAIRE_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { notifySuccess } from '@/utils/alerts';
import { formatDateTime } from '@/utils/format';
import { DefinitionGrid, SelfGate, SectionCard } from './StagiaireShared';
import { useStagiaireSelf } from './useStagiaireSelf';

export default function StagiaireSettings() {
  const self = useStagiaireSelf();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();

  function exportProfile() {
    const payload = {
      exported_at: new Date().toISOString(),
      account: {
        email: user?.email,
        role: user?.role,
        last_login_at: user?.last_login_at,
      },
      profile: self.stagiaire,
      inscription: self.inscription,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `mes-donnees-${self.stagiaire?.matricule ?? 'stagiaire'}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    notifySuccess('Export généré', 'Vos données de profil ont été téléchargées.');
  }

  return (
    <SelfGate loading={self.loading} error={self.error} onRetry={self.reload}>
      <PageHeader
        eyebrow="Mon compte"
        title="Paramètres"
        description="Gérez l’affichage de votre espace et consultez les informations de sécurité de votre compte."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Mon compte"
          description="Les informations d’identification sont gérées par l’administration."
        >
          <DefinitionGrid
            items={[
              ['Email de connexion', user?.email ?? '—'],
              ['Rôle', user ? ROLE_LABELS[user.role] : '—'],
              [
                'Statut du compte',
                <Badge key="status" tone={statusTone(user?.statut ?? 'active')}>
                  {user?.statut ?? '—'}
                </Badge>,
              ],
              ['Dernière connexion', formatDateTime(user?.last_login_at)],
              ['Matricule', self.stagiaire?.matricule ?? '—'],
              [
                'Statut stagiaire',
                self.stagiaire ? optionLabel(STAGIAIRE_STATUS_OPTIONS, self.stagiaire.statut) : '—',
              ],
            ]}
          />
          <div className="border-t border-stroke p-5 dark:border-white/10">
            <Link
              to="/app/mon-espace/profil"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <FiUser className="h-4 w-4" /> Modifier mes coordonnées personnelles
            </Link>
          </div>
        </SectionCard>

        <SectionCard
          title="Sécurité"
          description="Votre email officiel et votre mot de passe ne sont pas modifiables depuis cet espace."
        >
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-3 border border-stroke p-4 dark:border-white/10">
              <FiShield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-black dark:text-white">
                  Mot de passe et email
                </p>
                <p className="mt-1 text-xs leading-relaxed text-body dark:text-body-dark">
                  Contactez l’administration pour toute réinitialisation de mot de passe ou
                  modification de votre adresse email officielle.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 border border-stroke p-4 dark:border-white/10">
              <FiUser className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold text-black dark:text-white">
                  Données administratives
                </p>
                <p className="mt-1 text-xs leading-relaxed text-body dark:text-body-dark">
                  Le matricule, la formation, la promotion et les résultats officiels restent
                  sous le contrôle de l’administration.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={exportProfile}
              icon={<FiDownload className="h-4 w-4" />}
            >
              Exporter mes données de profil
            </Button>
          </div>
        </SectionCard>

        <SectionCard
          title="Affichage"
          description="Choisissez le thème de votre espace personnel."
          className="lg:col-span-2"
        >
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {[
              { value: 'light' as const, label: 'Thème clair', icon: FiSun },
              { value: 'dark' as const, label: 'Thème sombre', icon: FiMoon },
            ].map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={`flex items-center gap-3 border px-4 py-4 text-left transition-colors ${
                    theme === option.value
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-stroke text-dark hover:border-primary/40 dark:border-white/10 dark:text-white'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 items-center justify-center ${
                      theme === option.value ? 'bg-primary text-white' : 'bg-gray2 dark:bg-white/10'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-xs text-body dark:text-body-dark">
                      {theme === option.value ? 'Thème actif' : 'Appliquer ce thème'}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </SelfGate>
  );
}
