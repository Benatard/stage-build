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
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative flex max-h-[calc(100dvh-1rem)] w-full flex-col bg-white shadow-2xl dark:bg-gray-dark sm:my-auto sm:max-h-[calc(100dvh-4rem)]',
          sizes[size],
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-stroke px-4 py-4 dark:border-white/10 sm:px-6">
          <div className="min-w-0">
            <h2 className="break-words text-lg font-bold text-black dark:text-white">{title}</h2>
            {description && (
              <p className="mt-1 break-words text-sm text-body dark:text-body-dark">{description}</p>
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

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>

        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-stroke px-4 py-4 dark:border-white/10 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3 sm:px-6 [&>*]:w-full sm:[&>*]:w-auto">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
