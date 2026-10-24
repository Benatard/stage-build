import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { FiLoader } from 'react-icons/fi';
import { cn } from '@/utils/format';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-btn hover:bg-primary-dark disabled:hover:bg-primary',
  secondary:
    'bg-black text-white hover:bg-[#232B3B] dark:bg-white dark:text-black dark:hover:bg-white/90',
  outline:
    'border border-stroke bg-white text-dark hover:border-primary hover:text-primary dark:border-white/10 dark:bg-transparent dark:text-white',
  ghost:
    'text-body hover:bg-primary/10 hover:text-primary dark:text-body-dark',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-xs gap-2',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-7 py-3.5 text-sm gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <FiLoader className="h-4 w-4 animate-spin" /> : icon}
      {children}
    </button>
  );
}
