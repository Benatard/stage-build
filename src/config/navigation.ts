export type NavItem = {
  path: string;
  label: string;
};

export const publicRoutes: NavItem[] = [
  { path: '/', label: 'Accueil' },
  { path: '/a-propos', label: 'À propos' },
  { path: '/services', label: 'Services' },
  { path: '/plateformes', label: 'Plateformes' },
  { path: '/contact', label: 'Contact' },
];
