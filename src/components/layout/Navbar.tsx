import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiArrowRight, FiLogIn, FiMenu, FiMoon, FiSun, FiX } from 'react-icons/fi';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { publicAnchors, publicRoutes } from '@/config/navigation';
import { useTheme } from '@/context/ThemeContext';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/90 dark:bg-gray-dark/90 backdrop-blur-md shadow-card'
          : 'bg-white/70 dark:bg-gray-dark/70 backdrop-blur-sm'
      }`}
    >
      <div className="page-container">
        <div className="flex h-20 items-center justify-between">
          <Link to="/" className="flex flex-shrink-0 items-center">
            <BrandLogo className="h-10 w-auto" />
          </Link>

          <nav className="hidden items-center gap-9 lg:flex">
            {publicRoutes.map((route) => {
              const active = location.pathname === route.path;
              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={`group relative text-[15px] font-medium transition-colors ${
                    active
                      ? 'text-primary'
                      : 'text-dark hover:text-primary dark:text-body-dark'
                  }`}
                >
                  {route.label}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-0.5 bg-primary transition-all duration-300 ${
                      active ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              );
            })}
            {publicAnchors.map((anchor) => (
              <a
                key={anchor.href}
                href={anchor.href}
                className="text-[15px] font-medium text-dark transition-colors hover:text-primary dark:text-body-dark"
              >
                {anchor.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Basculer le thème"
              className="flex h-10 w-10 items-center justify-center bg-gray2 text-dark transition-all hover:text-primary hover:ring-4 hover:ring-primary/15 dark:bg-[#2C303B] dark:text-white"
            >
              {theme === 'dark' ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
            </button>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-btn transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-card-hover"
            >
              Se connecter <FiLogIn className="h-4 w-4" />
            </Link>
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Basculer le thème"
              className="flex h-10 w-10 items-center justify-center bg-gray2 text-dark transition-colors hover:text-primary dark:bg-[#2C303B] dark:text-white"
            >
              {theme === 'dark' ? <FiSun className="h-4 w-4" /> : <FiMoon className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="text-dark dark:text-white"
              aria-label="Menu"
            >
              {mobileOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="space-y-3 border-t border-stroke/70 py-4 dark:border-[#2C303B] lg:hidden">
            {publicRoutes.map((route) => (
              <Link
                key={route.path}
                to={route.path}
                className={`block text-base font-medium ${
                  location.pathname === route.path
                    ? 'text-primary'
                    : 'text-dark dark:text-body-dark'
                }`}
                onClick={() => setMobileOpen(false)}
              >
                {route.label}
              </Link>
            ))}
            {publicAnchors.map((anchor) => (
              <a
                key={anchor.href}
                href={anchor.href}
                className="block text-base font-medium text-dark dark:text-body-dark"
                onClick={() => setMobileOpen(false)}
              >
                {anchor.label}
              </a>
            ))}
            <div className="pt-2">
              <Link
                to="/login"
                className="btn-primary-root w-full"
                onClick={() => setMobileOpen(false)}
              >
                Se connecter <FiArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
