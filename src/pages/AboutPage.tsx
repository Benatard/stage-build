import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiEye, FiTarget } from 'react-icons/fi';
import { PageMeta } from '@/components/ui/PageMeta';
import { Reveal } from '@/components/ui/Reveal';
import { SectionTitle } from '@/components/ui/SectionTitle';
import { company } from '@/config/site';
import { stats } from '@/data/stats';
import { values } from '@/data/about';

export default function AboutPage() {
  return (
    <div>
      <PageMeta
        title="À propos"
        description={`Découvrez ${company.legal}, son histoire, sa vision et ses valeurs.`}
      />

      <section className="relative overflow-hidden bg-white dark:bg-gray-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(74,108,247,0.12)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)] pointer-events-none" />
        <div className="absolute -top-40 -right-32 w-[480px] h-[480px] bg-primary/15 blur-3xl pointer-events-none" />
        <div className="page-container relative py-20 md:py-28">
          <Reveal className="max-w-[800px] mx-auto text-center">
            <span className="eyebrow-root">
              <span className="h-1.5 w-1.5 bg-primary inline-block" />
              À propos de nous
            </span>
            <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-black dark:text-white">
              Une entreprise congolaise{' '}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                au service de l'innovation
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-body dark:text-body-dark max-w-[680px] mx-auto">
              {company.description}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#161B24]">
        <div className="page-container py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <Reveal>
              <span className="eyebrow-root mb-4">
                <span className="h-1.5 w-1.5 bg-primary inline-block" />
                Notre histoire
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-black dark:text-white">
                Bâtie sur l'innovation et la qualité
              </h2>
              <p className="mt-6 text-base leading-relaxed text-body dark:text-body-dark">
                Fondée pour répondre aux besoins technologiques croissants de la République
                Démocratique du Congo, {company.legal} a bâti sa réputation sur l'innovation et la
                qualité. Nous avons passé avec succès plusieurs tests et avons adapté nos
                compétences pour répondre aux besoins en constante évolution du secteur minier.
              </p>
              <p className="mt-4 text-base leading-relaxed text-body dark:text-body-dark">
                Aujourd'hui, nous développons des ERP complets comme Afya ERP (gestion
                hospitalière) et Miner ERP (gestion minière), avec plus de 20 modules intégrés
                pour automatiser vos processus métier. Notre expertise couvre également les
                systèmes embarqués, la robotique, l'infrastructure IT et les réseaux.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className="relative card-root overflow-hidden shadow-card-hover">
                <img
                  src="/images/about-office.svg"
                  alt={`${company.name} en action`}
                  className="w-full h-auto"
                  loading="lazy"
                />
                <span className="badge-root absolute top-5 right-5">
                  3+ années d'expertise
                </span>
                <div className="absolute bottom-5 left-5 card-root px-5 py-3.5 shadow-card-hover">
                  <p className="text-lg font-extrabold text-black dark:text-white">20+</p>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-body dark:text-body-dark">
                    Modules ERP développés
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Reveal>
              <div className="group card-root p-9 h-full transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1.5">
                <div className="h-16 w-16 bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-blue-600">
                  <FiEye className="w-7 h-7 text-primary transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-black dark:text-white">Notre Vision</h3>
                <p className="mt-3 text-base leading-relaxed text-body dark:text-body-dark">
                  Transformer l'industrie congolaise par l'innovation technologique. Devenir le
                  partenaire de référence des entreprises congolaises pour leur transformation
                  digitale.
                </p>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="group card-root p-9 h-full transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1.5">
                <div className="h-16 w-16 bg-primary/10 flex items-center justify-center transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-blue-600">
                  <FiTarget className="w-7 h-7 text-primary transition-colors duration-300 group-hover:text-white" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-black dark:text-white">Notre Mission</h3>
                <p className="mt-3 text-base leading-relaxed text-body dark:text-body-dark">
                  Développer des solutions logicielles sur mesure, des ERP complets et des
                  infrastructures IT performantes pour améliorer l'efficacité opérationnelle de nos
                  clients.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container pb-16 md:pb-24">
          <Reveal>
            <div className="relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 px-8 py-12 md:px-14">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-28 -left-20 w-72 h-72 bg-black/10 blur-3xl pointer-events-none" />
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
            eyebrow="Ce qui nous guide"
            title="Nos Valeurs"
            sub="Les principes qui guident chacune de nos actions au quotidien."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map(({ title, desc }, index) => (
              <Reveal key={title} delay={index * 100}>
                <div className="group card-root p-8 h-full transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1.5">
                  <span className="text-3xl font-extrabold text-[#E9EDF4] dark:text-[#2E3542] group-hover:text-primary/25 transition-colors duration-300">
                    0{index + 1}
                  </span>
                  <div className="mt-4 h-12 w-12 bg-primary/10 flex items-center justify-center">
                    <FiCheck className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-black dark:text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-body dark:text-body-dark">
                    {desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <Reveal>
            <div className="relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 px-8 py-14 md:px-16 text-center">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-black/10 blur-2xl pointer-events-none" />
              <h2 className="relative text-3xl md:text-4xl font-bold tracking-tight text-white">
                Envie de collaborer avec nous ?
              </h2>
              <div className="relative mt-9 flex justify-center">
                <Link to="/contact" className="btn-white-root">
                  Travailler avec nous <FiArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
