import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck } from 'react-icons/fi';
import { PageMeta } from '@/components/ui/PageMeta';
import { Reveal } from '@/components/ui/Reveal';
import { stats } from '@/data/stats';
import { services } from '@/data/services';

export default function ServicesPage() {
  return (
    <div>
      <PageMeta
        title="Services"
        description="Découvrez les modules de services de FLASH EMPIRE : développement de logiciels, ERP, infrastructure IT, maintenance et audit informatique."
      />

      <section className="relative overflow-hidden bg-white dark:bg-gray-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(74,108,247,0.12)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)] pointer-events-none" />
        <div className="absolute -top-40 -right-32 w-[480px] h-[480px] bg-primary/15 blur-3xl pointer-events-none" />
        <div className="page-container relative py-20 md:py-28">
          <Reveal className="max-w-[800px] mx-auto text-center">
            <span className="eyebrow-root">
              <span className="h-1.5 w-1.5 bg-primary inline-block" />
              Nos services
            </span>
            <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-black dark:text-white">
              Les modules de nos{' '}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                services
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-body dark:text-body-dark max-w-[680px] mx-auto">
              Des solutions complètes et sur mesure : logiciels, ERP, infrastructure IT,
              maintenance et audit — pour automatiser vos processus métier et moderniser vos
              opérations.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#161B24]">
        <div className="page-container py-16 md:py-24">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {services.map(({ icon: Icon, image, title, desc, points }, index) => (
              <Reveal key={title} delay={(index % 2) * 100}>
                <div className="group card-root overflow-hidden h-full transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1.5">
                  <div className="relative h-52 overflow-hidden bg-white dark:bg-gray-dark">
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
                  <div className="p-9">
                    <div className="h-14 w-14 flex items-center justify-center bg-primary/10 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-blue-600">
                      <Icon className="w-6 h-6 text-primary transition-colors duration-300 group-hover:text-white" />
                    </div>
                    <h2 className="mt-5 text-xl font-bold text-black dark:text-white">{title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-body dark:text-body-dark">
                      {desc}
                    </p>
                    <ul className="mt-6 space-y-3">
                      {points.map((point) => (
                        <li
                          key={point}
                          className="flex items-start gap-3 text-sm font-medium text-dark dark:text-body-dark"
                        >
                          <span className="mt-0.5 h-5 w-5 bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <FiCheck className="w-3 h-3 text-primary" />
                          </span>
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
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
          <Reveal className="max-w-[700px] mx-auto text-center">
            <span className="eyebrow-root mb-4">
              <span className="h-1.5 w-1.5 bg-primary inline-block" />
              Un projet ?
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight text-black dark:text-white">
              Un besoin spécifique ?
            </h2>
            <p className="mt-4 text-base md:text-lg text-body dark:text-body-dark">
              Nos experts développent des solutions sur mesure adaptées à votre secteur
              d'activité.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary-root">
                Demander un devis <FiArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/plateformes" className="btn-black-root">
                Voir nos plateformes <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
