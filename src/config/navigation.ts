export type NavItem = {
  path: string;
  label: string;
};

export type AnchorItem = {
  href: string;
  label: string;
};

export const publicRoutes: NavItem[] = [{ path: '/', label: 'Accueil' }];

export const publicAnchors: AnchorItem[] = [
  { href: '/#modules', label: 'Modules' },
  { href: '/#parcours', label: 'Parcours' },
  { href: '/#profils', label: 'Profils' },
];
