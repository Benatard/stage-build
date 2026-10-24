import { useEffect, useState } from 'react';
import { FiArrowUp } from 'react-icons/fi';

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="Retour en haut"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className={`fixed bottom-6 right-6 z-40 h-11 w-11 bg-primary text-white shadow-card-hover hover:bg-primary-dark hover:-translate-y-1 transition-all duration-300 flex items-center justify-center ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'
      }`}
    >
      <FiArrowUp className="w-5 h-5" />
    </button>
  );
}
