import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowRight,
  FiCheckCircle,
  FiChevronRight,
  FiClipboard,
  FiFolder,
  FiLock,
  FiShield,
  FiTrendingUp,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import { PageMeta } from '@/components/ui/PageMeta';
import { Reveal } from '@/components/ui/Reveal';
import { SectionTitle } from '@/components/ui/SectionTitle';
import {
  landingStats,
  lifecycleSteps,
  moduleGroups,
  pillars,
  roleProfiles,
} from '@/data/landing';
import { cn } from '@/utils/format';

const problems = [
  'Feuilles de présence dispersées',
  'Cahiers de notes tenus manuellement',
  'Fichiers Excel multiples et divergents',
  'Documents papier difficiles à retrouver',
];

const outcomes = [
  'Un dossier stagiaire centralisé',
  'Des indicateurs disponibles en temps réel',
  'Des alertes avant la rupture de parcours',
  'Un historique complet et traçable',
];

export default function HomePage() {
  const [activeGroupId, setActiveGroupId] = useState(moduleGroups[0].id);
  const activeGroup = moduleGroups.find((group) => group.id === activeGroupId) ?? moduleGroups[0];

  return (
    <div>
      <PageMeta
        title="Gestion et suivi des stagiaires"
        description="StageBuild centralise le dossier stagiaire, les formations, les présences, les évaluations, les compétences, les bulletins et le pilotage pédagogique."
      />

      <section className="relative overflow-hidden bg-white dark:bg-gray-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(74,108,247,0.12)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)] pointer-events-none" />
        <div className="absolute -top-40 -right-32 h-[480px] w-[480px] rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-48 -left-32 h-[480px] w-[480px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />

        <div className="page-container relative grid items-center gap-14 pb-20 pt-16 md:pb-28 md:pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <Reveal>
            <span className="eyebrow-root">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Plateforme de gestion pédagogique
            </span>

            <h1 className="mt-7 text-4xl font-extrabold leading-[1.08] tracking-tight text-black dark:text-white sm:text-5xl lg:text-[58px]">
              Gestion et suivi des ,{' '}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
               stagiaires
              </span>
            </h1>

            <p className="mt-6 max-w-[600px] text-base leading-relaxed text-body dark:text-body-dark md:text-lg">
              StageBuild réunit dans une seule plateforme le dossier du stagiaire, les formations,
              les présences, les évaluations, les compétences, les bulletins et le pilotage
              pédagogique. Chaque information devient consultable, validable et traçable.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/login" className="btn-primary-root">
                Accéder à la plateforme <FiLock className="h-4 w-4" />
              </Link>
              <a href="#modules" className="btn-outline-root">
                Découvrir les modules <FiArrowRight className="h-4 w-4" />
              </a>
              <Link to="/reservation" className="btn-outline-root">
                Réserver une place <FiArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <ul className="mt-9 grid gap-3 text-sm text-body dark:text-body-dark sm:grid-cols-3">
              {['Permissions par rôle', 'Données centralisées', 'Traçabilité complète'].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <FiCheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </Reveal>

          <Reveal delay={180}>
            <div className="relative mx-auto w-full max-w-[480px]">
              <div className="absolute -inset-4 bg-gradient-to-br from-primary/15 to-blue-600/10 blur-2xl" />
              <div className="relative border border-stroke bg-white shadow-card-hover dark:border-white/10 dark:bg-[#151B28]">
                <div className="flex items-center justify-between border-b border-stroke px-5 py-4 dark:border-white/10">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-body dark:text-body-dark">
                      Dossier stagiaire
                    </p>
                    <p className="mt-1 text-sm font-bold text-black dark:text-white">
                      Aperçu du suivi
                    </p>
                  </div>
                  <span className="bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
                    Actif
                  </span>
                </div>

                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center bg-primary text-sm font-extrabold text-white">
                      SM
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-black dark:text-white">
                        Sarah Mwamba
                      </p>
                      <p className="text-xs text-body dark:text-body-dark">
                        DEV-WEB-2026 · Développement Full-Stack
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary">STG-2026-014</span>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-2">
                    {[
                      { label: 'Moyenne', value: '14,8', suffix: '/20' },
                      { label: 'Présence', value: '92', suffix: '%' },
                      { label: 'Compétences', value: '18', suffix: '/24' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-gray2 px-3 py-3 dark:bg-white/5">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-body dark:text-body-dark">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-black dark:text-white">
                          {stat.value}
                          <span className="text-[11px] font-semibold text-body">{stat.suffix}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-4">
                    {[
                      { label: 'Modules validés', value: 78, tone: 'bg-primary' },
                      { label: 'Assiduité', value: 92, tone: 'bg-emerald-500' },
                      { label: 'Objectifs de stage', value: 65, tone: 'bg-violet-500' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-body dark:text-body-dark">
                            {item.label}
                          </span>
                          <span className="font-bold text-black dark:text-white">{item.value}%</span>
                        </div>
                        <div className="mt-2 h-1.5 bg-stroke dark:bg-white/10">
                          <div
                            className={cn('h-full', item.tone)}
                            style={{ width: `${item.value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-stroke pt-4 dark:border-white/10">
                    <span className="flex items-center gap-2 text-[11px] text-body dark:text-body-dark">
                      <FiClipboard className="h-3.5 w-3.5 text-primary" />
                      Prochaine évaluation : 28 octobre
                    </span>
                    <span className="text-[11px] font-bold text-primary">Voir le dossier</span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-4 hidden border border-stroke bg-white px-4 py-3 shadow-card dark:border-white/10 dark:bg-[#1E232E] sm:block">
                <div className="flex items-center gap-2">
                  <FiShield className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-xs font-bold text-black dark:text-white">Accès par rôle</p>
                    <p className="text-[10px] text-body dark:text-body-dark">
                      Permissions contrôlées
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="border-y border-stroke bg-gray-50 dark:border-white/10 dark:bg-[#161B24]">
        <div className="page-container py-10">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {landingStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl font-extrabold tracking-tight text-black dark:text-white">
                  {stat.value}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-body dark:text-body-dark">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Le constat"
            title="Sortir de la dispersion des informations"
            sub="Les présences, les notes, les évaluations et les documents ne doivent plus vivre dans des supports séparés. StageBuild les fait converger vers un dossier unique."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Reveal>
              <div className="h-full border border-rose-200 bg-rose-50/60 p-7 dark:border-rose-500/20 dark:bg-rose-500/5">
                <span className="inline-flex items-center gap-2 bg-rose-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-rose-600 dark:text-rose-300">
                  <FiX className="h-3.5 w-3.5" /> Sans centralisation
                </span>
                <ul className="mt-6 space-y-4">
                  {problems.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-body dark:text-body-dark">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-rose-500/10 text-rose-500">
                        <FiX className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="h-full border border-emerald-200 bg-emerald-50/60 p-7 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                <span className="inline-flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600 dark:text-emerald-300">
                  <FiCheckCircle className="h-3.5 w-3.5" /> Avec StageBuild
                </span>
                <ul className="mt-6 space-y-4">
                  {outcomes.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-body dark:text-body-dark">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center bg-emerald-500/10 text-emerald-500">
                        <FiCheckCircle className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {pillars.map(({ icon: Icon, title, description }, index) => (
              <Reveal key={title} delay={index * 100}>
                <div className="card-root h-full border border-stroke p-7 dark:border-white/10">
                  <span className="flex h-12 w-12 items-center justify-center bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-black dark:text-white">{title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-body dark:text-body-dark">
                    {description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="modules"
        className="scroll-mt-24 border-y border-stroke bg-gray-50 dark:border-white/10 dark:bg-[#161B24]"
      >
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Couverture fonctionnelle"
            title="Tous les modules du suivi des stagiaires"
            sub="Huit domaines, trente-cinq modules métier et un seul objectif : rendre le parcours du stagiaire lisible, mesurable et maîtrisable."
          />

          <div className="mt-10 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <Reveal>
              <div className="sticky top-24 space-y-1.5">
                {moduleGroups.map((group) => {
                  const Icon = group.icon;
                  const active = group.id === activeGroup.id;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setActiveGroupId(group.id)}
                      aria-pressed={active}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold transition-colors',
                        active
                          ? 'bg-primary text-white shadow-btn'
                          : 'bg-white text-body hover:bg-primary/5 hover:text-primary dark:bg-[#1E232E] dark:text-body-dark dark:hover:bg-white/5 dark:hover:text-white',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1">{group.label}</span>
                      <span
                        className={cn(
                          'text-[10px] font-bold',
                          active ? 'text-white/70' : 'text-body/60 dark:text-body-dark/60',
                        )}
                      >
                        {group.modules.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </Reveal>

            <Reveal delay={100}>
              <div className="border border-stroke bg-white p-6 dark:border-white/10 dark:bg-gray-dark md:p-8">
                <div className="flex flex-col justify-between gap-3 border-b border-stroke pb-6 dark:border-white/10 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      {activeGroup.label}
                    </p>
                    <h3 className="mt-2 text-2xl font-extrabold tracking-tight text-black dark:text-white">
                      {activeGroup.title}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-body dark:text-body-dark">
                      {activeGroup.description}
                    </p>
                  </div>
                  <span className="shrink-0 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                    {activeGroup.modules.length} modules
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {activeGroup.modules.map(({ icon: Icon, title, description, points }) => (
                    <div
                      key={title}
                      className="group border border-stroke p-5 transition-colors hover:border-primary/40 dark:border-white/10"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-black dark:text-white">{title}</h4>
                          <p className="mt-1 text-xs leading-relaxed text-body dark:text-body-dark">
                            {description}
                          </p>
                        </div>
                      </div>
                      <ul className="mt-4 space-y-1.5">
                        {points.map((point) => (
                          <li
                            key={point}
                            className="flex items-start gap-2 text-[11px] text-body dark:text-body-dark"
                          >
                            <FiChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            {point}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="parcours" className="scroll-mt-24 bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Parcours du stagiaire"
            title="Un cycle de vie complet, sans rupture"
            sub="Chaque étape alimente la suivante. Le dossier reste la source unique de vérité, de l’admission jusqu’à l’archivage."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {lifecycleSteps.map((step, index) => (
              <Reveal key={step.step} delay={(index % 4) * 80}>
                <div className="relative h-full border border-stroke p-6 dark:border-white/10">
                  <span className="text-4xl font-extrabold leading-none tracking-tight text-primary/15">
                    {step.step}
                  </span>
                  <h3 className="mt-4 text-base font-bold text-black dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-body dark:text-body-dark">
                    {step.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="profils"
        className="scroll-mt-24 border-y border-stroke bg-gray-50 dark:border-white/10 dark:bg-[#161B24]"
      >
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Acteurs"
            title="Chaque profil dispose du bon niveau d’accès"
            sub="Administrateur, direction, responsables, formateurs, maître de stage et stagiaire partagent le même système avec des permissions adaptées."
          />

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {roleProfiles.map(({ icon: Icon, role, description }, index) => (
              <Reveal key={role} delay={(index % 4) * 80}>
                <div className="card-root h-full border border-stroke p-6 dark:border-white/10">
                  <span className="flex h-11 w-11 items-center justify-center bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-sm font-bold text-black dark:text-white">{role}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-body dark:text-body-dark">
                    {description}
                  </p>
                </div>
              </Reveal>
            ))}

            <Reveal delay={240}>
              <div className="flex h-full flex-col justify-between bg-primary p-6 text-white">
                <div>
                  <FiUsers className="h-6 w-6 text-white/70" />
                  <h3 className="mt-4 text-sm font-bold">Un espace pour chacun</h3>
                  <p className="mt-2 text-xs leading-relaxed text-white/70">
                    Le système applique les permissions côté serveur et limite chaque utilisateur
                    à son périmètre.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-white hover:underline"
                >
                  Se connecter <FiArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <Reveal>
            <div className="relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 px-8 py-12 md:px-14 md:py-16">
              <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-black/10 blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] pointer-events-none" />

              <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div>
                  <span className="inline-flex items-center gap-2 bg-white/15 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                    <FiFolder className="h-3.5 w-3.5" /> Dossier centralisé
                  </span>
                  <h2 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
                    Où en est ce stagiaire ? La réponse est dans un seul dossier.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
                    Moyenne, taux de présence, compétences acquises, difficultés, plan
                    d’amélioration, appréciation finale et documents : tout est accessible au même
                    endroit.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 lg:flex-col">
                  <Link to="/login" className="btn-white-root">
                    Ouvrir mon espace <FiArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#modules"
                    className="inline-flex items-center justify-center gap-2.5 border border-white/25 bg-black/20 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-black/35"
                  >
                    Revoir les modules <FiTrendingUp className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
