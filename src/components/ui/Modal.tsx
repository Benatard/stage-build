import { useEffect, type ReactNode } from 'react';
import { FiX } from 'react-icons/fi';
import { cn } from '@/utils/format';

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
};

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative my-auto w-full bg-white shadow-2xl dark:bg-gray-dark',
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stroke px-6 py-4 dark:border-white/10">
          <div>
            <h2 className="text-lg font-bold text-black dark:text-white">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-body dark:text-body-dark">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center text-body transition-colors hover:bg-gray2 hover:text-dark dark:text-body-dark dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Fermer"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-stroke px-6 py-4 dark:border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
