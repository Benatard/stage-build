import { useEffect, useState } from 'react';
import { FiMail, FiPhone, FiSave, FiUser } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Form';
import { STAGIAIRE_STATUS_OPTIONS, optionLabel } from '@/config/options';
import { dataService } from '@/services/data.service';
import type { Stagiaire } from '@/types/domain';
import { notifyError, notifySuccess } from '@/utils/alerts';
import { formatDate, initials } from '@/utils/format';
import { DefinitionGrid, SelfGate, SectionCard } from './StagiaireShared';
import { useSelfAcademic } from './useStagiaireSelf';

type ContactDraft = {
  photo_url: string;
  telephone: string;
  adresse: string;
};

const emptyDraft: ContactDraft = { photo_url: '', telephone: '', adresse: '' };

export default function StagiaireProfile() {
  const self = useSelfAcademic();
  const [draft, setDraft] = useState<ContactDraft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!self.stagiaire) return;
    setDraft({
      photo_url: self.stagiaire.photo_url ?? '',
      telephone: self.stagiaire.telephone ?? '',
      adresse: self.stagiaire.adresse ?? '',
    });
  }, [self.stagiaire]);

  async function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!self.stagiaire) return;
    setSaving(true);

    try {
      await dataService.updateRow<Stagiaire>('stagiaires', self.stagiaire.id, {
        photo_url: draft.photo_url.trim() || null,
        telephone: draft.telephone.trim() || null,
        adresse: draft.adresse.trim() || null,
      });
      notifySuccess('Coordonnées mises à jour');
      self.reload();
    } catch {
      notifyError('Mise à jour impossible', 'Vos coordonnées n’ont pas pu être enregistrées.');
    } finally {
      setSaving(false);
    }
  }

  const stagiaire = self.stagiaire;

  return (
    <SelfGate loading={self.loading} error={self.error} onRetry={self.reload}>
      {stagiaire && (
        <>
          <PageHeader
            eyebrow="Mon espace"
            title="Mon profil"
            description="Consultez votre dossier et mettez à jour uniquement vos coordonnées personnelles."
          />

          <div className="mb-5 card-root border border-stroke p-5 dark:border-white/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              {stagiaire.photo_url ? (
                <img
                  src={stagiaire.photo_url}
                  alt="Photo de profil"
                  className="h-20 w-20 shrink-0 object-cover"
                />
              ) : (
                <span className="flex h-20 w-20 shrink-0 items-center justify-center bg-primary text-2xl font-bold text-white">
                  {initials(`${stagiaire.prenom} ${stagiaire.nom}`)}
                </span>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-black dark:text-white">
                    {stagiaire.prenom} {stagiaire.nom} {stagiaire.postnom ?? ''}
                  </h2>
                  <Badge tone={statusTone(stagiaire.statut)}>
                    {optionLabel(STAGIAIRE_STATUS_OPTIONS, stagiaire.statut)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-body dark:text-body-dark">
                  {stagiaire.matricule} · {stagiaire.domaine ?? 'Domaine non précisé'}
                </p>
                <div className="mt-2 flex flex-wrap gap-4 text-xs text-body dark:text-body-dark">
                  <span className="flex items-center gap-1.5">
                    <FiMail className="h-3.5 w-3.5" /> {stagiaire.email ?? '—'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <FiPhone className="h-3.5 w-3.5" /> {stagiaire.telephone ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              title="Informations administratives"
              description="Ces données sont gérées par l’administration et ne sont pas modifiables."
            >
              <DefinitionGrid
                items={[
                  ['Sexe', stagiaire.sexe ?? '—'],
                  ['Date de naissance', formatDate(stagiaire.date_naissance)],
                  ['Lieu de naissance', stagiaire.lieu_naissance ?? '—'],
                  ['Établissement d’origine', stagiaire.etablissement_origine ?? '—'],
                  ['Niveau d’études', stagiaire.niveau_etudes ?? '—'],
                  ['Diplôme', stagiaire.diplome ?? '—'],
                  ['Domaine', stagiaire.domaine ?? '—'],
                  ['Spécialité', stagiaire.specialite ?? '—'],
                  ['Contact d’urgence', stagiaire.contact_urgence_nom ?? '—'],
                  ['Téléphone d’urgence', stagiaire.contact_urgence_telephone ?? '—'],
                ]}
              />
            </SectionCard>

            <SectionCard
              title="Mes coordonnées"
              description="Vous pouvez mettre à jour votre photo, votre téléphone et votre adresse."
            >
              <form onSubmit={saveContact} className="grid gap-4 p-5 sm:grid-cols-2">
                <Field label="Photo (URL)" className="sm:col-span-2">
                  <Input
                    value={draft.photo_url}
                    placeholder="https://…"
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, photo_url: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Téléphone">
                  <Input
                    type="tel"
                    value={draft.telephone}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, telephone: event.target.value }))
                    }
                  />
                </Field>
                <Field label="Adresse">
                  <Input
                    value={draft.adresse}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, adresse: event.target.value }))
                    }
                  />
                </Field>
                <Field
                  label="Adresse email"
                  className="sm:col-span-2"
                  hint="Toute modification d’email doit être autorisée par l’administration."
                >
                  <Input value={stagiaire.email ?? ''} readOnly disabled />
                </Field>
                <div className="sm:col-span-2">
                  <Button type="submit" loading={saving} icon={<FiSave className="h-4 w-4" />}>
                    Enregistrer mes coordonnées
                  </Button>
                </div>
              </form>
            </SectionCard>
          </div>

          <SectionCard
            title="Ma formation"
            description="Informations issues de votre inscription validée."
            className="mt-5"
          >
            <DefinitionGrid
              columns={3}
              items={[
                ['Formation', self.formation?.name ?? '—'],
                ['Promotion', self.promotion ? `${self.promotion.code} — ${self.promotion.name ?? ''}`.trim() : '—'],
                ['Statut inscription', self.inscription?.status ?? '—'],
                ['Début', formatDate(self.inscription?.start_date)],
                ['Fin prévue', formatDate(self.inscription?.end_date)],
                ['Compte', self.user?.email ?? '—'],
              ]}
            />
          </SectionCard>

          <p className="mt-4 flex items-center gap-2 text-xs text-body dark:text-body-dark">
            <FiUser className="h-4 w-4" /> Les champs administratifs, le matricule et l’email
            officiel restent sous contrôle de l’administration.
          </p>
        </>
      )}
    </SelfGate>
  );
}
