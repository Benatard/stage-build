import type { IconType } from 'react-icons';
import {
  FiCode,
  FiCpu,
  FiHeart,
  FiServer,
  FiTool,
} from 'react-icons/fi';

export type ServiceItem = {
  icon: IconType;
  image: string;
  title: string;
  desc: string;
  points: string[];
};

export const services: ServiceItem[] = [
  {
    icon: FiCode,
    image: '/images/services/dev-software.svg',
    title: 'Développement de Logiciels & ERP',
    desc: "Notre équipe d'experts développe des solutions logicielles sur mesure et des systèmes ERP complets pour automatiser vos processus métier.",
    points: [
      'Applications web & mobiles sur mesure',
      'Systèmes ERP clé en main',
      'Intégration et migration de données',
    ],
  },
  {
    icon: FiCpu,
    image: '/images/services/miner-erp.svg',
    title: 'Miner ERP - Solution Minière',
    desc: 'Un progiciel complet pour les entreprises minières : modules RH, Procurement, IT, Finance et Safety pour gérer efficacement tous les départements.',
    points: [
      'Modules RH, Procurement, Finance, Safety',
      'Conçu pour optimiser les opérations minières',
      'Fonctionnalités adaptées au secteur',
    ],
  },
  {
    icon: FiHeart,
    image: '/images/services/afya-erp.svg',
    title: 'Afya ERP - Gestion Hospitalière',
    desc: 'Notre solution innovante pour révolutionner la gestion des établissements de santé : ticket, réception, caisse, médecin, pharmacie, laboratoire et plus.',
    points: [
      'Plus de 20 modules intégrés',
      'Automatisation des processus de soins',
      'Optimisation des ressources hospitalières',
    ],
  },
  {
    icon: FiServer,
    image: '/images/services/infra-it.svg',
    title: 'Infrastructure IT & Réseaux',
    desc: 'Construction de centres de données (data centers) et services réseau complets : câblage Catégorie 6, vidéosurveillance (CCTV) et supports de transmission.',
    points: [
      'Centres de données & data centers',
      'Câblage Ethernet Catégorie 6',
      'Fibre optique, UTP, SFTP et coaxiaux',
    ],
  },
  {
    icon: FiTool,
    image: '/images/services/maintenance.svg',
    title: 'Maintenance & Audit Informatique',
    desc: "Maintenance d'équipements informatiques (HP, Canon, Brother) et audit de vos systèmes d'information, infrastructures IT et processus associés.",
    points: [
      'Maintenance ordinateurs & imprimantes',
      'Audit de conformité et de sécurité',
      "Évaluation de l'efficacité des systèmes",
    ],
  },
  {
    icon: FiCpu,
    image: '/images/services/robotics.svg',
    title: 'Systèmes Embarqués & Robotique',
    desc: 'Développement de systèmes embarqués et de solutions robotiques pour répondre aux besoins spécifiques de nos clients industriels.',
    points: [
      'Conception de systèmes embarqués',
      'Automatisation industrielle',
      'Solutions sur mesure',
    ],
  },
];
