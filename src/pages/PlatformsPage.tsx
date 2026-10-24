import { Link } from 'react-router-dom';
import { FiCheck, FiExternalLink } from 'react-icons/fi';
import { PageMeta } from '@/components/ui/PageMeta';
import { Reveal } from '@/components/ui/Reveal';
import { platforms } from '@/data/platforms';

export default function PlatformsPage() {
  return (
    <div>
      <PageMeta
        title="Plateformes"
        description="Découvrez les plateformes en ligne de FLASH EMPIRE : Afya ERP, Miner ERP et Flash Cloud."
      />

      <section className="relative overflow-hidden bg-white dark:bg-gray-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(74,108,247,0.12)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)] pointer-events-none" />
        <div className="absolute -top-40 -right-32 w-[480px] h-[480px] bg-primary/15 blur-3xl pointer-events-none" />
        <div className="page-container relative py-20 md:py-28">
          <Reveal className="max-w-[800px] mx-auto text-center">
            <span className="eyebrow-root">
              <span className="h-1.5 w-1.5 bg-primary inline-block" />
              Plateformes en ligne
            </span>
            <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-black dark:text-white">
              Nos{' '}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                plateformes
              </span>{' '}
              en ligne
            </h1>
            <p className="mt-6 text-base md:text-lg text-body dark:text-body-dark max-w-[680px] mx-auto">
              Des plateformes web complètes qui révolutionnent la gestion des établissements de
              santé, des entreprises minières et de nos clients, accessibles où que vous soyez.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#161B24]">
        <div className="page-container py-16 md:py-24 space-y-10">
          {platforms.map(({ image, name, tagline, desc, features }, index) => (
            <Reveal key={name} delay={index * 100}>
              <div className="group card-root overflow-hidden transition-all duration-300 hover:shadow-card-hover">
                <div
                  className={`flex flex-col md:flex-row ${
                    index % 2 === 1 ? 'md:flex-row-reverse' : ''
                  }`}
                >
                  <div className="relative md:w-[45%] min-h-[300px] overflow-hidden bg-white dark:bg-gray-dark flex items-stretch">
                    <img
                      src={image}
                      alt={name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                    <span className="badge-root absolute top-5 right-5">Plateforme en ligne</span>
                  </div>
                  <div className="md:w-[55%] p-8 md:p-12">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                      {tagline}
                    </p>
                    <h2 className="mt-2 text-3xl font-bold tracking-tight text-black dark:text-white">
                      {name}
                    </h2>
                    <p className="mt-4 text-base leading-relaxed text-body dark:text-body-dark">
                      {desc}
                    </p>
                    <ul className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 text-sm font-medium text-dark dark:text-body-dark"
                        >
                          <span className="mt-0.5 h-5 w-5 bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FiCheck className="w-3 h-3 text-primary" />
                          </span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/contact"
                      className="mt-8 inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-primary shadow-btn hover:bg-primary-dark hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
                    >
                      Demander un accès <FiExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <Reveal>
            <div className="relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 px-8 py-14 md:px-16 text-center">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 blur-2xl pointer-events-none" />
              <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-black/10 blur-2xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] pointer-events-none" />
              <h2 className="relative text-3xl md:text-4xl font-bold tracking-tight text-white">
                Accédez à nos plateformes
              </h2>
              <p className="relative mt-4 text-white/80 max-w-xl mx-auto">
                Contactez-nous pour obtenir un accès démo ou un déploiement complet de nos
                solutions ERP.
              </p>
              <div className="relative mt-9 flex justify-center">
                <Link to="/contact" className="btn-white-root">
                  Demander un accès <FiExternalLink className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
