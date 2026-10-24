import { Link } from 'react-router-dom';
import {
  FiFacebook,
  FiInstagram,
  FiLinkedin,
  FiMail,
  FiMapPin,
  FiPhone,
} from 'react-icons/fi';
import { publicRoutes } from '@/config/navigation';
import { company } from '@/config/site';

const socialLinks = [
  { label: 'Facebook', href: '#', icon: FiFacebook },
  { label: 'Instagram', href: '#', icon: FiInstagram },
  { label: 'LinkedIn', href: '#', icon: FiLinkedin },
];

const footerServices = [
  'Développement & ERP',
  'Miner ERP',
  'Afya ERP',
  'Infrastructure IT & Réseaux',
];

export function Footer() {
  return (
    <footer className="relative bg-white dark:bg-gray-dark">
      <div className="h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="page-container pt-16 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link to="/" className="flex items-center gap-3">
              <img src="/images/logo-mark.svg" alt={company.name} className="h-10 w-10" />
              <span className="text-xl font-extrabold tracking-tight text-black dark:text-white">
                FLASH<span className="text-primary">EMPIRE</span>
              </span>
            </Link>
            <p className="mt-5 text-sm leading-relaxed text-body dark:text-body-dark max-w-xs">
              {company.description}
            </p>
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="h-10 w-10 bg-gray2 dark:bg-[#2C303B] flex items-center justify-center text-dark dark:text-white hover:text-white hover:bg-primary hover:-translate-y-0.5 transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-black dark:text-white">Liens rapides</h3>
            <ul className="mt-5 space-y-3 text-sm text-body dark:text-body-dark">
              {publicRoutes.map((route) => (
                <li key={route.path}>
                  <Link
                    to={route.path}
                    className="inline-flex items-center gap-2 hover:text-primary hover:translate-x-0.5 transition-all duration-300"
                  >
                    <span className="h-1 w-1 bg-primary/40" />
                    {route.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-black dark:text-white">Nos services</h3>
            <ul className="mt-5 space-y-3 text-sm text-body dark:text-body-dark">
              {footerServices.map((service) => (
                <li key={service}>
                  <Link
                    to="/services"
                    className="inline-flex items-center gap-2 hover:text-primary hover:translate-x-0.5 transition-all duration-300"
                  >
                    <span className="h-1 w-1 bg-primary/40" />
                    {service}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-black dark:text-white">Contact</h3>
            <ul className="mt-5 space-y-4 text-sm text-body dark:text-body-dark">
              <li className="flex items-start gap-3">
                <span className="h-9 w-9 bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FiMapPin className="w-4 h-4 text-primary" />
                </span>
                <span className="mt-1.5">{company.address.split('\n')[0]}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-9 w-9 bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FiPhone className="w-4 h-4 text-primary" />
                </span>
                <span className="mt-0.5">{company.phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="h-9 w-9 bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FiMail className="w-4 h-4 text-primary" />
                </span>
                <span className="mt-0.5">{company.email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-14 pt-7 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-stroke/70 dark:border-[#2C303B]">
          <p className="text-sm text-body dark:text-body-dark">
            &copy; {new Date().getFullYear()} {company.legal}. Tous droits réservés.
          </p>
          <div className="flex items-center gap-6 text-sm text-body dark:text-body-dark">
            <a href="#" className="hover:text-primary transition-colors">
              Politique de confidentialité
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              Mentions légales
            </a>
            <Link to="/forge" className="hover:text-primary transition-colors">
              API Forge
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
