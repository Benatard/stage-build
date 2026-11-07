import { useEffect, useState } from 'react';
import { cn } from '@/utils/format';

type InstitutionLogoProps = {
  name?: string | null;
  code?: string | null;
  logoUrl?: string | null;
  color?: string | null;
  className?: string;
  imgClassName?: string;
  alt?: string;
};

function fallbackLabel(name?: string | null, code?: string | null): string {
  const source = (code ?? name ?? '?').trim();
  if (!source) return '?';
  return source.slice(0, 3).toUpperCase();
}

export function InstitutionLogo({
  name,
  code,
  logoUrl,
  color,
  className,
  imgClassName,
  alt,
}: InstitutionLogoProps) {
  const [failed, setFailed] = useState(false);
  const url = logoUrl?.trim();

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (url && !failed) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center overflow-hidden bg-white',
          className,
        )}
      >
        <img
          src={url}
          alt={alt ?? name ?? 'Logo institution'}
          className={cn('h-full w-full object-contain', imgClassName)}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center text-xs font-bold text-white',
        className,
      )}
      style={{ backgroundColor: color ?? '#2563eb' }}
      aria-hidden={!name && !code}
      title={name ?? undefined}
    >
      {fallbackLabel(name, code)}
    </span>
  );
}
