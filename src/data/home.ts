import type { IconType } from 'react-icons';
import {
  FiActivity,
  FiAward,
  FiBriefcase,
  FiCpu,
  FiLayers,
  FiMonitor,
  FiServer,
  FiShield,
  FiTrendingUp,
} from 'react-icons/fi';

export type HighlightItem = {
  icon: IconType;
  title: string;
  desc: string;
  badge: string;
};

export type GalleryItem = {
  image: string;
  category: string;
  title: string;
  icon: IconType;
};

export const highlights: HighlightItem[] = [
  {
    icon: FiAward,
    title: 'Notre Vision',
    desc: "Transformer l'industrie congolaise par l'innovation technologique",
    badge: "3+ années d'expertise",
  },
  {
    icon: FiLayers,
    title: 'Nos Solutions',
    desc: 'ERP, systèmes embarqués et robotique pour tous secteurs',
    badge: '20+ modules développés',
  },
  {
    icon: FiTrendingUp,
    title: 'Notre Impact',
    desc: "Améliorer l'efficacité opérationnelle de nos clients",
    badge: '92% de satisfaction',
  },
];

export const gallery: GalleryItem[] = [
  {
    image: '/images/services/infra-it.svg',
    category: 'Infrastructure & Équipements',
    title: 'Centre de données et infrastructure IT',
    icon: FiServer,
  },
  {
    image: '/images/services/maintenance.svg',
    category: 'Infrastructure & Équipements',
    title: 'Équipements de pointe',
    icon: FiMonitor,
  },
  {
    image: '/images/services/afya-erp.svg',
    category: 'Solutions ERP et Logiciels',
    title: 'Interface Afya ERP',
    icon: FiActivity,
  },
  {
    image: '/images/services/dev-software.svg',
    category: 'Solutions ERP et Logiciels',
    title: 'Dashboard Miner ERP',
    icon: FiBriefcase,
  },
  {
    image: '/images/services/miner-erp.svg',
    category: 'Projets et Réalisations',
    title: 'Projet minier Miner ERP',
    icon: FiShield,
  },
  {
    image: '/images/services/robotics.svg',
    category: 'Projets et Réalisations',
    title: 'Automatisation & robotique',
    icon: FiCpu,
  },
];
