import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/utils/format';

const baseField =
  'w-full border border-stroke bg-white px-3.5 py-2.5 text-sm text-dark outline-none transition-all duration-200 placeholder:text-body/60 focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-gray2 disabled:text-body dark:border-white/10 dark:bg-[#242936] dark:text-white dark:placeholder:text-body-dark/60';

type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
};

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <label className={cn('block', className)}>
      {label && (
        <span className="mb-1.5 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-body dark:text-body-dark">
          {label}
          {required && <span className="text-rose-500">*</span>}
        </span>
      )}
      {children}
      {error ? (
        <span className="mt-1 block text-xs font-medium text-rose-600">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-body dark:text-body-dark">{hint}</span>
      ) : null}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...rest }: InputProps) {
  return <input className={cn(baseField, className)} {...rest} />;
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
};

export function Select({ options, placeholder, className, ...rest }: SelectProps) {
  return (
    <select className={cn(baseField, 'pr-9', className)} {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className, rows = 4, ...rest }: TextareaProps) {
  return <textarea rows={rows} className={cn(baseField, 'resize-y', className)} {...rest} />;
}

export function Checkbox({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={cn('flex items-center gap-2.5 text-sm text-dark dark:text-white', className)}>
      <input
        type="checkbox"
        className="h-4 w-4 border-stroke text-primary focus:ring-primary/20"
        {...rest}
      />
      {label}
    </label>
  );
}
