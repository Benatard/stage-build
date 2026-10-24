import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiSearch } from 'react-icons/fi';
import { Badge, statusTone } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/Feedback';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAuth } from '@/context/AuthContext';
import { useReferenceData } from '@/hooks/useReferenceData';
import { EVALUATION_TYPE_OPTIONS, optionLabel } from '@/config/options';
import { ROLE_LABELS } from '@/config/permissions';
import { formatDate, fullName } from '@/utils/format';

type ResultItem = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  link: string;
  badge?: string;
};

export default function SearchPage() {
  const { data } = useReferenceData();
  const { can } = useAuth();
  const [search, setSearch] = useState('');

  const results = useMemo<ResultItem[]>(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];

    const items: ResultItem[] = [];

    data.stagiaires.forEach((stagiaire) => {
      const haystack = [fullName(stagiaire), stagiaire.matricule, stagiaire.email, stagiaire.telephone, stagiaire.domaine, stagiaire.specialite]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (haystack.includes(term)) {
        items.push({
          id: stagiaire.id,
          type: 'Stagiaire',
          title: fullName(stagiaire),
          subtitle: `${stagiaire.matricule} · ${stagiaire.domaine ?? 'Domaine non précisé'}`,
          link: `/app/stagiaires/${stagiaire.id}`,
          badge: stagiaire.statut,
        });
      }
    });

    data.formations.forEach((formation) => {
      if ([formation.name, formation.domain, formation.level].filter(Boolean).join(' ').toLowerCase().includes(term)) {
        items.push({
          id: formation.id,
          type: 'Formation',
          title: formation.name,
          subtitle: `${formation.domain ?? '—'} · ${formation.duration_months ?? 0} mois`,
          link: '/app/formations',
          badge: formation.status,
        });
      }
    });

    data.modules.forEach((module) => {
      if ([module.name, module.description].filter(Boolean).join(' ').toLowerCase().includes(term)) {
        items.push({
          id: module.id,
          type: 'Module',
          title: module.name,
          subtitle: data.formations.find((formation) => formation.id === module.formation_id)?.name ?? '—',
          link: '/app/modules',
        });
      }
    });

    data.promotions.forEach((promotion) => {
      if ([promotion.code, promotion.name].filter(Boolean).join(' ').toLowerCase().includes(term)) {
        items.push({
          id: promotion.id,
          type: 'Promotion',
          title: promotion.code,
          subtitle: `${formatDate(promotion.start_date)} → ${formatDate(promotion.end_date)}`,
          link: '/app/promotions',
          badge: promotion.status,
        });
      }
    });

    data.evaluations.forEach((evaluation) => {
      if ([evaluation.title, evaluation.period, evaluation.type].filter(Boolean).join(' ').toLowerCase().includes(term)) {
        items.push({
          id: evaluation.id,
          type: 'Évaluation',
          title: evaluation.title,
          subtitle: `${optionLabel(EVALUATION_TYPE_OPTIONS, evaluation.type)} · ${formatDate(evaluation.date)}`,
          link: '/app/evaluations',
          badge: evaluation.status,
        });
      }
    });

    if (can('users')) {
      data.users.forEach((user) => {
        if ([fullName(user), user.email, ROLE_LABELS[user.role]].filter(Boolean).join(' ').toLowerCase().includes(term)) {
          items.push({
            id: user.id,
            type: 'Utilisateur',
            title: fullName(user),
            subtitle: `${user.email} · ${ROLE_LABELS[user.role]}`,
            link: '/app/utilisateurs',
            badge: user.statut,
          });
        }
      });
    }

    return items;
  }, [search, data, can]);

  const grouped = useMemo(() => {
    const map = new Map<string, ResultItem[]>();
    results.forEach((item) => {
      const list = map.get(item.type) ?? [];
      list.push(item);
      map.set(item.type, list);
    });
    return Array.from(map.entries());
  }, [results]);

  return (
    <div>
      <PageHeader
        eyebrow="Vue d’ensemble"
        title="Recherche globale"
        description="Retrouvez rapidement un stagiaire, une formation, un module, une évaluation ou un utilisateur."
      />

      <div className="card-root mb-6 border border-stroke p-5 dark:border-white/10">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Saisissez au moins 2 caractères…"
          className="w-full"
        />
        <p className="mt-3 text-xs text-body dark:text-body-dark">
          {search.trim().length < 2
            ? 'La recherche couvre l’ensemble des dossiers de la plateforme.'
            : `${results.length} résultat(s) pour « ${search.trim()} ».`}
        </p>
      </div>

      {search.trim().length >= 2 && results.length === 0 ? (
        <div className="card-root border border-stroke dark:border-white/10">
          <EmptyState
            title="Aucun résultat"
            description={`Aucun élément ne correspond à « ${search.trim()} ».`}
            icon={<FiSearch className="h-6 w-6" />}
          />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([type, items]) => (
            <div key={type} className="card-root border border-stroke dark:border-white/10">
              <div className="border-b border-stroke px-5 py-3 dark:border-white/10">
                <h2 className="text-sm font-bold text-black dark:text-white">
                  {type}s <span className="text-body dark:text-body-dark">({items.length})</span>
                </h2>
              </div>
              <div className="divide-y divide-stroke dark:divide-white/5">
                {items.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to={item.link}
                    className="flex items-center justify-between gap-4 px-5 py-3 transition-colors hover:bg-primary/[0.03] dark:hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-black dark:text-white">{item.title}</p>
                        {item.badge && (
                          <Badge tone={statusTone(item.badge)}>{item.badge.replace('_', ' ')}</Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-body dark:text-body-dark">{item.subtitle}</p>
                    </div>
                    <FiArrowRight className="h-4 w-4 shrink-0 text-body" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
