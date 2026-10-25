import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  FiBell,
  FiChevronDown,
  FiExternalLink,
  FiLogOut,
  FiMenu,
  FiMoon,
  FiSun,
  FiX,
} from 'react-icons/fi';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { appNavigation } from '@/config/appNavigation';
import { isForgeConfigured } from '@/config/env';
import { ROLE_LABELS } from '@/config/permissions';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useForgeTable } from '@/hooks/useForgeTable';
import { cn, fullName, initials } from '@/utils/format';
import type { AppNotification } from '@/types/domain';

export default function AppLayout() {
  const { user, logout, can } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { rows: notifications } = useForgeTable<AppNotification>('notifications', {
    filters: { user_id: user?.id, status: 'unread' },
    limit: 50,
    enabled: Boolean(user?.id && isForgeConfigured),
  });

  const groups = useMemo(
    () =>
      appNavigation
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => can(item.permission)),
        }))
        .filter((group) => group.items.length > 0),
    [can],
  );

  const currentItem = useMemo(() => {
    const items = appNavigation.flatMap((group) => group.items);
    return items.find((item) =>
      item.end ? location.pathname === item.path : location.pathname.startsWith(item.path),
    );
  }, [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
    setUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  const displayName = fullName(user);

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-[#0F141F]">
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-stroke bg-white transition-transform duration-300 dark:border-white/10 dark:bg-[#151B28] lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[72px] items-center justify-between border-b border-stroke px-5 dark:border-white/10">
          <Link to="/app" className="flex flex-col gap-1">
            <BrandLogo className="h-9 w-auto" />
            <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-body dark:text-body-dark">
              Suivi stagiaires
            </p>
          </Link>
          <button
            type="button"
            className="text-body hover:text-dark dark:text-body-dark dark:hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Fermer"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-body/70 dark:text-body-dark/60">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.end}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-body hover:bg-gray2 hover:text-dark dark:text-body-dark dark:hover:bg-white/5 dark:hover:text-white',
                        )
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-stroke p-4 dark:border-white/10">
          <div className="flex items-center gap-3 bg-gray2 p-3 dark:bg-white/5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-primary text-xs font-bold text-white">
              {initials(displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-black dark:text-white">
                {displayName}
              </p>
              <p className="truncate text-[10px] text-body dark:text-body-dark">
                {user ? ROLE_LABELS[user.role] : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="text-body transition-colors hover:text-rose-500 dark:text-body-dark"
              title="Se déconnecter"
            >
              <FiLogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[270px]">
        <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-stroke bg-white/90 px-4 backdrop-blur-md dark:border-white/10 dark:bg-[#151B28]/90 sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center bg-gray2 text-dark dark:bg-white/10 dark:text-white lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <FiMenu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-body dark:text-body-dark">
              StageBuild
            </p>
            <h2 className="truncate text-sm font-bold text-black dark:text-white">
              {currentItem?.label ?? 'Espace de gestion'}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/app/notifications"
              className="relative flex h-9 w-9 items-center justify-center bg-gray2 text-body transition-colors hover:text-primary dark:bg-white/10 dark:text-body-dark"
              aria-label="Notifications"
            >
              <FiBell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center bg-rose-500 px-1 text-[9px] font-bold text-white">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center bg-gray2 text-body transition-colors hover:text-primary dark:bg-white/10 dark:text-body-dark"
              aria-label="Basculer le thème"
            >
              {theme === 'dark' ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
            </button>

            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="hidden h-9 w-9 items-center justify-center bg-gray2 text-body transition-colors hover:text-primary dark:bg-white/10 dark:text-body-dark sm:flex"
              aria-label="Voir le site"
            >
              <FiExternalLink className="h-4 w-4" />
            </a>

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((open) => !open)}
                className="flex items-center gap-2.5 border border-stroke bg-white py-1.5 pl-1.5 pr-2.5 transition-colors hover:border-primary/40 dark:border-white/10 dark:bg-transparent"
              >
                <span className="flex h-6 w-6 items-center justify-center bg-primary text-[10px] font-bold text-white">
                  {initials(displayName)}
                </span>
                <span className="hidden max-w-[120px] truncate text-xs font-semibold text-dark dark:text-white sm:block">
                  {displayName}
                </span>
                <FiChevronDown className="h-3.5 w-3.5 text-body" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full z-40 mt-2 w-60 border border-stroke bg-white p-2 shadow-card dark:border-white/10 dark:bg-gray-dark">
                  <div className="border-b border-stroke px-3 py-2 dark:border-white/10">
                    <p className="truncate text-sm font-semibold text-black dark:text-white">
                      {displayName}
                    </p>
                    <p className="truncate text-xs text-body dark:text-body-dark">{user?.email}</p>
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {user ? ROLE_LABELS[user.role] : ''}
                    </p>
                  </div>
                  <Link
                    to="/app/notifications"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-body hover:bg-gray2 hover:text-dark dark:text-body-dark dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <FiBell className="h-4 w-4" /> Notifications
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                  >
                    <FiLogOut className="h-4 w-4" /> Se déconnecter
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {!isForgeConfigured && (
          <div className="border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 sm:px-6">
            Configuration Forge Console incomplète : les données ne peuvent pas être chargées.
            Renseignez <code className="font-semibold">VITE_FORGE_PROJECT_KEY</code> et{' '}
            <code className="font-semibold">VITE_FORGE_API_KEY</code>.
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
