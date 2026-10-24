import { Link } from 'react-router-dom';
import { FiArrowRight, FiPhone } from 'react-icons/fi';
import { PageMeta } from '@/components/ui/PageMeta';
import { Reveal } from '@/components/ui/Reveal';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { company } from '@/config/site';
import { stats } from '@/data/stats';
import { gallery, highlights } from '@/data/home';
import { services } from '@/data/services';
import { platforms } from '@/data/platforms';

export default function HomePage() {
  return (
    <div>
      <PageMeta
        title="Accueil"
        description={`${company.legal} — Entreprise congolaise spécialisée en TIC : ERP, infrastructure IT, maintenance et audit informatique.`}
      />

      <section className="relative overflow-hidden bg-white dark:bg-gray-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(74,108,247,0.12)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)] pointer-events-none" />
        <div className="absolute -top-40 -right-32 w-[480px] h-[480px] rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-48 -left-32 w-[480px] h-[480px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
        <div className="page-container relative pt-[110px] md:pt-[140px] pb-20 md:pb-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 lg:gap-10 items-center">
            <Reveal>
              <span className="eyebrow-root">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                {company.legal}
              </span>
              <h1 className="mt-7 text-4xl sm:text-5xl lg:text-[60px] font-extrabold tracking-tight leading-[1.08] text-black dark:text-white">
                FLASH{' '}
                <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                  EMPIRE
                </span>
              </h1>
              <p className="mt-6 text-base md:text-lg text-body dark:text-body-dark max-w-[560px]">
                {company.description}
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Link to="/contact" className="btn-primary-root">
                  Contactez-nous <FiPhone className="w-4 h-4" />
                </Link>
                <Link to="/services" className="btn-outline-root">
                  Découvrir nos services <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="mt-12 grid grid-cols-3 max-w-md divide-x divide-stroke dark:divide-[#2C303B]">
                {stats.slice(0, 3).map(({ number, label }) => (
                  <div key={label} className="px-5 pl-0">
                    <div className="text-2xl md:text-3xl font-extrabold text-black dark:text-white">
                      {number}
                    </div>
                    <div className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-body dark:text-body-dark">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>

            <Reveal delay={200}>
              <div className="relative">
                <img
                  src="/images/hero-dashboard.svg"
                  alt={`Tableau de bord ${company.name}`}
                  className="w-full h-auto"
                  loading="eager"
                />
                <div className="absolute -top-5 -left-3 md:-left-8 card-root px-5 py-3.5 shadow-card-hover">
                  <p className="text-lg font-extrabold text-black dark:text-white">37+</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-body dark:text-body-dark">
                    Projets réalisés
                  </p>
                </div>
                <div className="absolute -bottom-5 -right-2 md:-right-6 card-root px-5 py-3.5 shadow-card-hover">
                  <p className="text-lg font-extrabold text-primary">92%</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-body dark:text-body-dark">
                    Satisfaction client
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#161B24]">
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Ce que nous faisons"
            title="Nos Modules de Services"
            sub="Des solutions complètes pour automatiser vos processus métier et moderniser votre infrastructure."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map(({ icon: Icon, image, title, desc }, index) => (
              <Reveal key={title} delay={(index % 3) * 100}>
                <Link
                  to="/services"
                  className="group relative block card-root overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1.5"
                >
                  <div className="relative h-44 overflow-hidden bg-white dark:bg-gray-dark">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="absolute top-4 right-4 bg-white dark:bg-gray-dark px-3 py-1 text-sm font-extrabold text-primary shadow-card">
                      0{index + 1}
                    </span>
                  </div>
                  <div className="p-7">
                    <div className="h-12 w-12 flex items-center justify-center bg-primary/10 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-blue-600">
                      <Icon className="w-6 h-6 text-primary transition-colors duration-300 group-hover:text-white" />
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-black dark:text-white">{title}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-body dark:text-body-dark">
                      {desc}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2.5 text-sm font-semibold text-primary">
                      En savoir plus
                      <span className="h-6 w-6 bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:translate-x-1">
                        <FiArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Notre impact"
            title={`${company.name} en Action`}
            sub="Découvrez comment nous transformons les défis en opportunités."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {highlights.map(({ icon: Icon, title, desc, badge }, index) => (
              <Reveal key={title} delay={index * 100}>
                <div className="group card-root overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1.5">
                  <div className="relative h-52 overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-blue-600/20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(74,108,247,0.18)_1px,transparent_0)] bg-[size:20px_20px] [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                    <Icon className="relative w-20 h-20 text-primary/70 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3" />
                    <span className="badge-root absolute top-4 right-4">{badge}</span>
                  </div>
                  <div className="p-7">
                    <h3 className="text-lg font-bold text-black dark:text-white">{title}</h3>
                    <p className="mt-2 text-sm text-body dark:text-body-dark">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container pb-16 md:pb-24">
          <Reveal>
            <div className="relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 px-8 py-12 md:px-14">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-white/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-28 -left-20 w-72 h-72 rounded-full bg-black/10 blur-3xl pointer-events-none" />
              <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {stats.map(({ number, label }, index) => (
                  <div key={label} className={index > 0 ? 'md:border-l md:border-white/15' : ''}>
                    <div className="text-3xl md:text-4xl font-extrabold text-white drop-shadow-sm">
                      {number}
                    </div>
                    <div className="mt-2 text-sm text-white/80">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#161B24]">
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Nos plateformes"
            title="Plateformes en ligne"
            sub="Des plateformes web qui révolutionnent la gestion des établissements de santé, des entreprises minières et de nos clients."
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platforms.map(({ icon: Icon, image, name, tagline, desc, to }, index) => (
              <Reveal key={name} delay={index * 100}>
                <Link
                  to={to}
                  className="group block card-root overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1.5"
                >
                  <div className="relative h-44 overflow-hidden bg-white dark:bg-gray-dark">
                    <img
                      src={image}
                      alt={name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-7">
                    <div className="flex items-center justify-between gap-4">
                      <div className="h-12 w-12 flex items-center justify-center bg-primary/10 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-blue-600">
                        <Icon className="w-6 h-6 text-primary transition-colors duration-300 group-hover:text-white" />
                      </div>
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-body dark:text-body-dark">
                        {tagline}
                      </span>
                    </div>
                    <h3 className="mt-5 text-lg font-bold text-black dark:text-white">{name}</h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-body dark:text-body-dark line-clamp-3">
                      {desc}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-2.5 text-sm font-semibold text-primary">
                      Explorer la plateforme
                      <span className="h-6 w-6 bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:text-white group-hover:translate-x-1">
                        <FiArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <SectionTitle
            eyebrow="Nos réalisations"
            title="Nos Réalisations en Images"
            sub="Découvrez nos projets, nos équipements et nos solutions à travers une galerie qui témoigne de notre expertise et de notre engagement pour l'excellence."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gallery.map(({ image, category, title }, index) => (
              <Reveal key={title} delay={(index % 3) * 100}>
                <div className="group card-root overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1.5">
                  <div className="relative h-52 overflow-hidden bg-white dark:bg-gray-dark">
                    <img
                      src={image}
                      alt={title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute inset-x-0 bottom-0 p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white text-base font-bold">{title}</p>
                    </div>
                    <span className="absolute top-4 left-4 bg-white dark:bg-gray-dark px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary shadow-card">
                      {category}
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container pb-16 md:pb-24">
          <Reveal>
            <div className="relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 px-8 py-14 md:px-16 md:py-20 text-center">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-black/10 blur-2xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] pointer-events-none" />
              <h2 className="relative text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
                Prêt à transformer votre entreprise ?
              </h2>
              <p className="relative mt-4 text-white/80 max-w-xl mx-auto">
                Notre équipe d'experts techniques vous accompagne dans vos projets industriels,
                miniers et technologiques. Obtenez une réponse personnalisée sous 24h ouvrées.
              </p>
              <div className="relative mt-9 flex flex-wrap justify-center gap-4">
                <Link to="/contact" className="btn-white-root">
                  Demander un devis <FiArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/plateformes"
                  className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 text-sm font-semibold bg-black/25 border border-white/25 text-white hover:bg-black/40 transition-colors duration-300"
                >
                  Nos plateformes <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
