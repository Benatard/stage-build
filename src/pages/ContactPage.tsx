import { useState, type ChangeEvent, type FormEvent } from 'react';
import { FiGlobe, FiMail, FiMapPin, FiPhone, FiSend } from 'react-icons/fi';
import { PageMeta } from '@/components/ui/PageMeta';
import { Reveal } from '@/components/ui/Reveal';
import { company } from '@/config/site';
import { isForgeConfigured } from '@/config/env';
import { contactApi, type ContactPayload } from '@/services/contact.service';
import { toast } from '@/utils/alert';

const infoCards = [
  { icon: FiMapPin, label: 'Adresse', value: company.address },
  { icon: FiPhone, label: 'Téléphone', value: company.phone },
  { icon: FiMail, label: 'Email & Site Web', value: `${company.email}\n${company.website}` },
  { icon: FiGlobe, label: 'Plateformes en ligne', value: 'Afya ERP, Miner ERP, Flash Cloud' },
];

const emptyForm: ContactPayload = { nom: '', email: '', message: '' };

export default function ContactPage() {
  const [form, setForm] = useState<ContactPayload>(emptyForm);
  const [newsletter, setNewsletter] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!form.nom || !form.email || !form.message) {
      toast('warning', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await contactApi.sendMessage(form);
      toast('success', 'Message envoyé avec succès');
      setForm(emptyForm);
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : "Impossible d'envoyer le message",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNewsletter = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newsletter) {
      toast('warning', 'Veuillez saisir votre email');
      return;
    }

    try {
      await contactApi.subscribeNewsletter(newsletter);
      toast('success', 'Inscription à la newsletter réussie');
      setNewsletter('');
    } catch (error) {
      toast(
        'error',
        error instanceof Error ? error.message : "Impossible de finaliser l'inscription",
      );
    }
  };

  return (
    <div>
      <PageMeta
        title="Contact"
        description="Contactez FLASH EMPIRE pour discuter de vos projets technologiques, industriels et miniers."
      />

      <section className="relative overflow-hidden bg-white dark:bg-gray-dark">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(74,108,247,0.12)_1px,transparent_0)] bg-[size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_25%,transparent_72%)] pointer-events-none" />
        <div className="absolute -top-40 -right-32 w-[480px] h-[480px] bg-primary/15 blur-3xl pointer-events-none" />
        <div className="page-container relative py-20 md:py-28">
          <Reveal className="max-w-[800px] mx-auto text-center">
            <span className="eyebrow-root">
              <span className="h-1.5 w-1.5 bg-primary inline-block" />
              Contactez-nous
            </span>
            <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight leading-tight text-black dark:text-white">
              Contactez nos{' '}
              <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                experts
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-body dark:text-body-dark max-w-[680px] mx-auto">
              Notre équipe d'experts techniques vous accompagne dans vos projets industriels,
              miniers et technologiques. Obtenez une réponse personnalisée sous 24h ouvrées.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="bg-gray-50 dark:bg-[#161B24]">
        <div className="page-container py-16 md:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <Reveal>
              <div className="card-root p-8 md:p-10">
                <h2 className="text-2xl font-bold tracking-tight text-black dark:text-white">
                  Envoyez-nous un message
                </h2>
                {!isForgeConfigured && (
                  <p className="mt-4 border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
                    Forge Console n'est pas encore configuré. Renseignez les variables
                    <code className="mx-1">VITE_FORGE_PROJECT_KEY</code> et
                    <code className="mx-1">VITE_FORGE_API_KEY</code> dans votre fichier
                    <code className="mx-1">.env.local</code>.
                  </p>
                )}
                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                  <div>
                    <label htmlFor="contact-nom" className="label-root mb-2.5">
                      Votre Nom
                    </label>
                    <input
                      id="contact-nom"
                      name="nom"
                      value={form.nom}
                      onChange={handleChange}
                      className="input-root"
                      placeholder="Votre nom"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="label-root mb-2.5">
                      Votre Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      className="input-root"
                      placeholder="votre@email.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-message" className="label-root mb-2.5">
                      Votre Message
                    </label>
                    <textarea
                      id="contact-message"
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={5}
                      className="input-root"
                      placeholder="Décrivez votre projet..."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary-root w-full disabled:opacity-60"
                  >
                    <FiSend className="w-4 h-4" /> {loading ? 'Envoi...' : 'Demander un devis'}
                  </button>
                </form>
              </div>
            </Reveal>

            <Reveal delay={150}>
              <div className="space-y-6">
                {infoCards.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="group card-root p-6 flex items-start gap-5 transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
                  >
                    <div className="h-[55px] w-[55px] bg-primary/10 flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-gradient-to-br group-hover:from-primary group-hover:to-blue-600">
                      <Icon className="w-6 h-6 text-primary transition-colors duration-300 group-hover:text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-body dark:text-body-dark">
                        {label}
                      </p>
                      {value.split('\n').map((line) => (
                        <p
                          key={line}
                          className="mt-1 text-base font-semibold text-dark dark:text-white"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-dark">
        <div className="page-container py-16 md:py-24">
          <Reveal>
            <div className="relative overflow-hidden bg-gradient-to-r from-primary to-blue-600 px-8 py-10 md:p-14">
              <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/15 blur-3xl pointer-events-none" />
              <div className="absolute -bottom-28 -left-20 w-72 h-72 bg-black/10 blur-3xl pointer-events-none" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)] pointer-events-none" />
              <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    Inscrivez-vous pour recevoir les dernières mises à jour
                  </h2>
                  <p className="mt-3 text-sm md:text-base text-white/80">
                    Recevez les dernières actualités, offres spéciales et nouvelles sur nos
                    produits directement dans votre boîte de réception.
                  </p>
                </div>
                <form onSubmit={handleNewsletter} className="flex flex-col sm:flex-row gap-3">
                  <input
                    value={newsletter}
                    onChange={(event) => setNewsletter(event.target.value)}
                    type="email"
                    placeholder="Votre email"
                    className="flex-1 bg-white/15 px-6 py-4 text-sm text-white placeholder:text-white/60 outline-none focus:bg-white/25 focus:ring-4 focus:ring-white/20 transition-all border border-white/25"
                  />
                  <button
                    type="submit"
                    className="px-8 py-4 text-sm font-semibold bg-black hover:bg-[#232B3B] hover:-translate-y-0.5 text-white transition-all duration-300 shadow-lg"
                  >
                    S'abonner
                  </button>
                </form>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
