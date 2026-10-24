import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiArrowRight, FiMenu, FiMoon, FiSun, FiX } from 'react-icons/fi';
import { publicRoutes } from '@/config/navigation';
import { company } from '@/config/site';
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
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 flex-shrink-0">
            <img src="/images/logo-mark.svg" alt={company.name} className="h-10 w-10" />
            <span className="text-xl font-extrabold tracking-tight text-black dark:text-white">
              FLASH<span className="text-primary">EMPIRE</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-10">
            {publicRoutes.map((route) => {
              const active = location.pathname === route.path;
              return (
                <Link
                  key={route.path}
                  to={route.path}
                  className={`group relative text-[15px] font-medium transition-colors ${
                    active ? 'text-primary' : 'text-dark dark:text-body-dark hover:text-primary'
                  }`}
                >
                  {route.label}
                  <span
                    className={`absolute left-0 -bottom-1.5 h-0.5 bg-primary transition-all duration-300 ${
                      active ? 'w-full' : 'w-0 group-hover:w-full'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Basculer le thème"
              className="h-10 w-10 bg-gray2 dark:bg-[#2C303B] flex items-center justify-center text-dark dark:text-white hover:text-primary hover:ring-4 hover:ring-primary/15 transition-all"
            >
              {theme === 'dark' ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
            </button>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary shadow-btn hover:bg-primary-dark hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
            >
              Demander un devis <FiArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="lg:hidden flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Basculer le thème"
              className="h-10 w-10 bg-gray2 dark:bg-[#2C303B] flex items-center justify-center text-dark dark:text-white hover:text-primary transition-colors"
            >
              {theme === 'dark' ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="text-dark dark:text-white"
              aria-label="Menu"
            >
              {mobileOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden py-4 space-y-3 border-t border-stroke/70 dark:border-[#2C303B]">
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
            <div className="pt-2">
              <Link
                to="/contact"
                className="btn-primary-root w-full"
                onClick={() => setMobileOpen(false)}
              >
                Demander un devis <FiArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
