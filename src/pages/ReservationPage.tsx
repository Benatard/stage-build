import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiPhone,
  FiShield,
  FiUsers,
} from 'react-icons/fi';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState, PageHeader } from '@/components/ui/Feedback';
import { Field, Input, Select } from '@/components/ui/Form';
import { PageMeta } from '@/components/ui/PageMeta';
import { GENDER_OPTIONS } from '@/config/options';
import {
  createReservation,
  isReservationsTableMissing,
  loadAvailability,
  loadPublicInstitutions,
  type PublicInstitution,
  type ReservationAvailability,
} from '@/services/reservation.service';
import type { Reservation } from '@/types/domain';
import { formatDate, getErrorMessage, todayISO } from '@/utils/format';

type Draft = {
  nom: string;
  postnom: string;
  prenom: string;
  sexe: string;
  date_naissance: string;
  telephone: string;
  email: string;
  institution_id: string;
  formation_id: string;
  promotion_id: string;
};

const emptyDraft: Draft = {
  nom: '',
  postnom: '',
  prenom: '',
  sexe: '',
  date_naissance: '',
  telephone: '',
  email: '',
  institution_id: '',
  formation_id: '',
  promotion_id: '',
};

export default function ReservationPage() {
  const [institutions, setInstitutions] = useState<PublicInstitution[]>([]);
  const [legacyInstitutions, setLegacyInstitutions] = useState(false);
  const [institutionsLoading, setInstitutionsLoading] = useState(true);
  const [institutionsError, setInstitutionsError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<ReservationAvailability[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Reservation | null>(null);

  const load = useCallback(async (institutionId?: string) => {
    setLoading(true);
    setLoadError(null);

    try {
      const items = await loadAvailability(institutionId);
      setAvailability(items);

      setDraft((current) => {
        const sameInstitution = (current.institution_id || '') === (institutionId || '');
        const currentSeat = items.find(
          (item) =>
            item.formation.id === current.formation_id &&
            item.promotion.id === current.promotion_id,
        );

        if (sameInstitution && currentSeat) return current;

        const first = items.find((item) => item.isOpen);
        return {
          ...current,
          institution_id: institutionId ?? '',
          formation_id: first?.formation.id ?? '',
          promotion_id: first?.promotion.id ?? '',
        };
      });
    } catch (error) {
      setAvailability([]);
      setLoadError(
        isReservationsTableMissing(error)
          ? 'Les réservations en ligne ne sont pas encore activées. Contactez l’administration.'
          : getErrorMessage(error, 'Impossible de charger les promotions disponibles.'),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      setInstitutionsLoading(true);

      try {
        const catalog = await loadPublicInstitutions();
        if (!active) return;

        setInstitutions(catalog.institutions);
        setLegacyInstitutions(catalog.legacy);
        setInstitutionsError(null);

        if (catalog.legacy) {
          await load();
        } else {
          setLoading(false);
        }
      } catch (error) {
        if (!active) return;
        setInstitutionsError(
          getErrorMessage(error, 'Impossible de charger la liste des institutions.'),
        );
        setLoading(false);
      } finally {
        if (active) setInstitutionsLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [load]);

  function handleInstitutionChange(institutionId: string) {
    setAvailability([]);
    setFormError(null);
    setDraft((current) => ({
      ...current,
      institution_id: institutionId,
      formation_id: '',
      promotion_id: '',
    }));

    if (institutionId) {
      void load(institutionId);
    } else {
      setLoadError(null);
      setLoading(false);
    }
  }

  const institutionOptions = useMemo(
    () =>
      institutions.map((institution) => ({
        value: institution.id,
        label: [institution.name, institution.city].filter(Boolean).join(' — '),
      })),
    [institutions],
  );

  const selectedInstitution = institutions.find(
    (institution) => institution.id === draft.institution_id,
  );
  const noPublicInstitutions = !legacyInstitutions && institutions.length === 0;
  const needsInstitution = institutions.length > 0 && !draft.institution_id;

  const formations = useMemo(() => {
    const map = new Map<string, ReservationAvailability['formation']>();
    availability.forEach((item) => {
      if (item.isOpen) map.set(item.formation.id, item.formation);
    });
    return Array.from(map.values()).sort((left, right) =>
      left.name.localeCompare(right.name, 'fr'),
    );
  }, [availability]);

  const formationOptions = useMemo(
    () => formations.map((formation) => ({ value: formation.id, label: formation.name })),
    [formations],
  );

  const selectedFormation = formations.find((formation) => formation.id === draft.formation_id);

  const selectedPromotions = useMemo(
    () =>
      availability.filter((item) => item.formation.id === draft.formation_id),
    [availability, draft.formation_id],
  );

  const openPromotions = useMemo(
    () => selectedPromotions.filter((item) => item.isOpen),
    [selectedPromotions],
  );

  const promotionOptions = useMemo(
    () =>
      openPromotions.map((item) => ({
        value: item.promotion.id,
        label:
          item.available === null
            ? `${item.promotion.code} — places disponibles`
            : `${item.promotion.code} — ${item.available} place${item.available > 1 ? 's' : ''} restante${item.available > 1 ? 's' : ''}`,
      })),
    [openPromotions],
  );

  const selectedSeat = selectedPromotions.find(
    (item) => item.promotion.id === draft.promotion_id,
  );

  const hasOpenPromotions = availability.some((item) => item.isOpen);
  const canSubmit =
    !submitting &&
    !loadError &&
    !needsInstitution &&
    Boolean(draft.formation_id) &&
    Boolean(draft.promotion_id) &&
    Boolean(selectedSeat?.isOpen);

  function handleFormationChange(formationId: string) {
    const next = availability.find((item) => item.formation.id === formationId && item.isOpen);
    setDraft((current) => ({
      ...current,
      formation_id: formationId,
      promotion_id: next?.promotion.id ?? '',
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (needsInstitution) {
      setFormError('Choisissez d’abord l’institution dans laquelle vous souhaitez réserver.');
      return;
    }

    if (!selectedSeat?.isOpen) {
      setFormError('Sélectionnez une promotion qui dispose encore de places.');
      return;
    }

    setSubmitting(true);
    const institutionId = draft.institution_id;

    try {
      const reservation = await createReservation({
        nom: draft.nom,
        postnom: draft.postnom,
        prenom: draft.prenom,
        sexe: (draft.sexe || undefined) as 'M' | 'F' | 'Autre' | undefined,
        date_naissance: draft.date_naissance || undefined,
        telephone: draft.telephone,
        email: draft.email,
        institution_id: institutionId || undefined,
        formation_id: draft.formation_id,
        promotion_id: draft.promotion_id,
      });

      setCreated(reservation);
      setDraft({ ...emptyDraft, institution_id: institutionId });
      setAvailability(await loadAvailability(institutionId || undefined));
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="bg-white dark:bg-gray-dark">
        <PageMeta
          title="Réservation enregistrée"
          description="Votre réservation d’inscription a bien été enregistrée."
        />
        <section className="page-container py-16 md:py-24">
          <div className="mx-auto max-w-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center dark:border-emerald-500/20 dark:bg-emerald-500/5 md:p-12">
            <span className="mx-auto flex h-16 w-16 items-center justify-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
              <FiCheckCircle className="h-8 w-8" />
            </span>
            <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
              Réservation enregistrée
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-black dark:text-white">
              Votre place est pré-réservée
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-body dark:text-body-dark">
              Présentez-vous à l’administration avec votre référence et une pièce d’identité.
              Votre inscription sera confirmée sur place.
            </p>

            <div className="mx-auto mt-7 max-w-md border border-emerald-300 bg-white px-5 py-4 dark:border-emerald-500/30 dark:bg-[#1E232E]">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-body dark:text-body-dark">
                Votre référence
              </p>
              <p className="mt-2 font-mono text-2xl font-extrabold tracking-wide text-primary">
                {created.reference}
              </p>
              {created.institution_id && (
                <p className="mt-3 text-xs font-semibold text-body dark:text-body-dark">
                  {institutions.find((institution) => institution.id === created.institution_id)
                    ?.name ?? 'Institution sélectionnée'}
                </p>
              )}
            </div>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/reservation" className="btn-primary-root" onClick={() => setCreated(null)}>
                Nouvelle réservation <FiArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/" className="btn-outline-root">
                Retour à l’accueil <FiArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-dark">
      <PageMeta
        title="Réserver une place"
        description="Réservez en ligne votre place dans une formation StageBuild. La confirmation de l’inscription se fait sur place auprès de l’administration."
      />

      <section className="relative overflow-hidden border-b border-stroke bg-gray-50 dark:border-white/10 dark:bg-[#161B24]">
        <div className="absolute -top-32 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="page-container relative py-12 md:py-16">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-body transition-colors hover:text-primary dark:text-body-dark"
          >
            <FiArrowLeft className="h-4 w-4" /> Retour à l’accueil
          </Link>

          <PageHeader
            eyebrow="Inscriptions"
            title="Réservez votre place en ligne"
            description="Choisissez l’institution, puis une formation et une promotion, et laissez vos coordonnées. Votre réservation reste en attente jusqu’à sa confirmation par l’administration."
          />
        </div>
      </section>

      <section className="page-container py-12 md:py-16">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
          <div className="card-root border border-stroke p-6 dark:border-white/10 md:p-8">
            <div className="flex items-start gap-3 border-b border-stroke pb-5 dark:border-white/10">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center bg-primary/10 text-primary">
                <FiUsers className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-black dark:text-white">Vos informations</h2>
                <p className="mt-1 text-sm text-body dark:text-body-dark">
                  Les champs marqués d’un astérisque sont obligatoires.
                </p>
              </div>
            </div>

            {institutionsError && (
              <div className="mt-6 border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                {institutionsError}
              </div>
            )}

            {institutions.length > 0 && (
              <div className="mt-6">
                <Field
                  label="Institution"
                  required
                  hint="Choisissez l’établissement dans lequel vous souhaitez réserver une place."
                >
                  <Select
                    required
                    value={draft.institution_id}
                    placeholder="Choisir une institution"
                    options={institutionOptions}
                    onChange={(event) => handleInstitutionChange(event.target.value)}
                  />
                </Field>
              </div>
            )}

            {institutionsLoading || loading ? (
              <div className="py-16 text-center text-sm text-body dark:text-body-dark">
                Chargement des promotions…
              </div>
            ) : loadError ? (
              <div className="mt-6">
                <EmptyState
                  title="Réservations indisponibles"
                  description={loadError}
                  action={
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void load(draft.institution_id || undefined)}
                    >
                      Réessayer
                    </Button>
                  }
                />
              </div>
            ) : institutionsError ? null : noPublicInstitutions ? (
              <div className="mt-6">
                <EmptyState
                  title="Aucune institution disponible"
                  description="Les réservations en ligne ne sont pas ouvertes pour le moment. Contactez l’administration pour connaître les prochaines ouvertures."
                  action={
                    <Link to="/" className="btn-outline-root">
                      Retour à l’accueil
                    </Link>
                  }
                />
              </div>
            ) : needsInstitution ? (
              <div className="mt-6">
                <EmptyState
                  title="Choisissez une institution"
                  description="Sélectionnez d’abord l’institution dans laquelle vous souhaitez réserver. Les formations et promotions affichées dépendent de cette institution."
                />
              </div>
            ) : !hasOpenPromotions ? (
              <div className="mt-6">
                <EmptyState
                  title="Aucune promotion ouverte"
                  description={`Aucune place n’est actuellement proposée en ligne${
                    selectedInstitution ? ` par ${selectedInstitution.name}` : ''
                  }. Contactez l’administration pour connaître les prochaines ouvertures.`}
                  action={
                    <Link to="/" className="btn-outline-root">
                      Retour à l’accueil
                    </Link>
                  }
                />
              </div>
            ) : (
              <form className="mt-6" onSubmit={handleSubmit}>
                {formError && (
                  <div className="mb-5 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    {formError}
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom" required>
                    <Input
                      required
                      value={draft.prenom}
                      placeholder="Votre prénom"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, prenom: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Nom" required>
                    <Input
                      required
                      value={draft.nom}
                      placeholder="Votre nom"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, nom: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Postnom">
                    <Input
                      value={draft.postnom}
                      placeholder="Votre postnom"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, postnom: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Sexe">
                    <Select
                      value={draft.sexe}
                      placeholder="Sélectionner…"
                      options={GENDER_OPTIONS}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, sexe: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Date de naissance">
                    <Input
                      type="date"
                      max={todayISO()}
                      value={draft.date_naissance}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          date_naissance: event.target.value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Téléphone" required>
                    <Input
                      type="tel"
                      required
                      value={draft.telephone}
                      placeholder="+243 …"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, telephone: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Email" required className="sm:col-span-2">
                    <Input
                      type="email"
                      required
                      value={draft.email}
                      placeholder="vous@exemple.com"
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, email: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Formation" required>
                    <Select
                      required
                      value={draft.formation_id}
                      placeholder="Choisir une formation"
                      options={formationOptions}
                      onChange={(event) => handleFormationChange(event.target.value)}
                    />
                  </Field>
                  <Field
                    label="Promotion"
                    required
                    hint={
                      openPromotions.length === 0
                        ? 'Aucune place disponible pour cette formation.'
                        : undefined
                    }
                  >
                    <Select
                      required
                      value={draft.promotion_id}
                      placeholder="Choisir une promotion"
                      options={promotionOptions}
                      disabled={openPromotions.length === 0}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          promotion_id: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>

                <div className="mt-6 flex flex-col gap-3 border-t border-stroke pt-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-relaxed text-body dark:text-body-dark">
                    Aucun paiement en ligne. La confirmation se fait sur place.
                  </p>
                  <Button type="submit" loading={submitting} disabled={!canSubmit}>
                    Réserver ma place <FiArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            )}
          </div>

          <aside className="space-y-6">
            <div className="border border-stroke bg-gray-50 p-6 dark:border-white/10 dark:bg-[#161B24]">
              <h2 className="text-sm font-bold uppercase tracking-wide text-black dark:text-white">
                Comment ça marche ?
              </h2>
              <ol className="mt-5 space-y-5">
                {[
                  {
                    icon: FiCalendar,
                    title: 'Choisissez votre formation',
                    text: 'Sélectionnez la formation et la promotion qui vous intéressent.',
                  },
                  {
                    icon: FiMail,
                    title: 'Laissez vos coordonnées',
                    text: 'Votre place est pré-réservée dès l’envoi du formulaire.',
                  },
                  {
                    icon: FiShield,
                    title: 'Confirmez sur place',
                    text: 'Présentez votre référence à l’administration pour finaliser l’inscription.',
                  },
                ].map(({ icon: Icon, title, text }, index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-black dark:text-white">
                        {index + 1}. {title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-body dark:text-body-dark">
                        {text}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="card-root border border-stroke p-6 dark:border-white/10">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-black dark:text-white">
                  Places disponibles
                </h2>
                <Badge tone="primary">
                  {selectedFormation?.name ?? 'Formation'}
                </Badge>
              </div>

              {selectedInstitution && (
                <p className="mt-2 text-xs font-semibold text-body dark:text-body-dark">
                  {selectedInstitution.name}
                  {selectedInstitution.city ? ` · ${selectedInstitution.city}` : ''}
                </p>
              )}

              {selectedPromotions.length === 0 ? (
                <p className="mt-4 text-sm text-body dark:text-body-dark">
                  {noPublicInstitutions
                    ? 'Aucune institution n’est ouverte aux réservations en ligne.'
                    : needsInstitution
                      ? 'Choisissez une institution pour voir les formations et promotions ouvertes.'
                      : 'Sélectionnez une formation pour voir les promotions ouvertes.'}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedPromotions.map((item) => (
                    <button
                      key={item.promotion.id}
                      type="button"
                      disabled={!item.isOpen}
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          promotion_id: item.promotion.id,
                        }))
                      }
                      className={`w-full border p-4 text-left transition-colors ${
                        draft.promotion_id === item.promotion.id
                          ? 'border-primary bg-primary/5'
                          : 'border-stroke hover:border-primary/40 dark:border-white/10'
                      } ${item.isOpen ? '' : 'cursor-not-allowed opacity-60'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-bold text-black dark:text-white">
                            {item.promotion.code}
                          </p>
                          <p className="mt-1 text-xs text-body dark:text-body-dark">
                            {item.promotion.name ?? 'Promotion'}
                          </p>
                        </div>
                        <Badge tone={item.available === 0 ? 'danger' : item.available === null ? 'info' : 'success'}>
                          {item.available === null
                            ? 'Places disponibles'
                            : item.available === 0
                              ? 'Complet'
                              : `${item.available} place${item.available > 1 ? 's' : ''}`}
                        </Badge>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-body dark:text-body-dark">
                        <FiClock className="h-3.5 w-3.5" />
                        {formatDate(item.promotion.start_date)} → {formatDate(item.promotion.end_date)}
                      </div>
                      {item.capacity !== null && (
                        <p className="mt-1 text-[11px] text-body dark:text-body-dark">
                          {item.used + item.pending} place(s) déjà occupée(s) sur {item.capacity}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-5 flex items-center gap-2 border-t border-stroke pt-4 text-[11px] text-body dark:border-white/10 dark:text-body-dark">
                <FiPhone className="h-3.5 w-3.5 text-primary" />
                Besoin d’aide ? Contactez l’administration.
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
