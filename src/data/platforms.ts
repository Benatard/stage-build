import type { IconType } from 'react-icons';
import { FiCloud, FiCpu, FiHeart } from 'react-icons/fi';

export type PlatformItem = {
  icon: IconType;
  image: string;
  name: string;
  tagline: string;
  desc: string;
  features: string[];
  to: string;
};

export const platforms: PlatformItem[] = [
  {
    icon: FiHeart,
    image: '/images/platforms/afya-dashboard.svg',
    name: 'Afya ERP',
    tagline: 'Plateforme de gestion hospitalière',
    desc: '« AFYA », qui signifie « santé » en swahili, est notre plateforme en ligne qui automatise les processus hospitaliers : réception, caisse, dispensaire, médecin, pharmacie, laboratoire, et bien plus, avec plus de 20 modules intégrés.',
    features: [
      'Plus de 20 modules intégrés',
      'Gestion des patients & tickets',
      'Pharmacie & laboratoire',
      'Tableaux de bord en temps réel',
    ],
    to: '/plateformes',
  },
  {
    icon: FiCpu,
    image: '/images/platforms/miner-dashboard.svg',
    name: 'Miner ERP',
    tagline: 'Plateforme de gestion minière',
    desc: "Notre plateforme en ligne pour les entreprises minières couvre l'ensemble des départements : RH, Procurement, IT, Finance et Safety, avec des fonctionnalités adaptées aux défis spécifiques du secteur minier.",
    features: [
      'Modules RH, Procurement, IT',
      'Finance & comptabilité minière',
      'Gestion de la sécurité (Safety)',
      'Optimisation des opérations',
    ],
    to: '/plateformes',
  },
  {
    icon: FiCloud,
    image: '/images/platforms/cloud-dashboard.svg',
    name: 'Flash Cloud',
    tagline: 'Portail client & support en ligne',
    desc: "Notre espace client en ligne pour suivre vos projets, gérer vos demandes de maintenance et accéder aux services d'assistance technique de FLASH EMPIRE, où que vous soyez.",
    features: [
      'Suivi de projets en ligne',
      'Demandes de maintenance',
      'Assistance technique 24/7',
      'Documentation & ressources',
    ],
    to: '/plateformes',
  },
];
