import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BackToTop } from '@/components/ui/BackToTop';
import { Footer } from './Footer';
import { Navbar } from './Navbar';

export default function MainLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
