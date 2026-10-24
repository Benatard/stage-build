import { FiSearch } from 'react-icons/fi';
import { cn } from '@/utils/format';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border border-stroke bg-white py-2.5 pl-10 pr-4 text-sm text-dark outline-none transition-all placeholder:text-body/70 focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-white/10 dark:bg-[#242936] dark:text-white"
      />
    </div>
  );
}
