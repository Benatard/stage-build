type BrandLogoProps = {
  className?: string;
  forceDark?: boolean;
  alt?: string;
};

const LIGHT_SRC = '/images/logo-stagebuild.svg';
const DARK_SRC = '/images/logo-stagebuild-dark.svg';

export function BrandLogo({
  className = 'h-10 w-auto',
  forceDark = false,
  alt = 'StageBuild',
}: BrandLogoProps) {
  if (forceDark) {
    return <img src={DARK_SRC} alt={alt} className={className} />;
  }

  return (
    <>
      <img src={LIGHT_SRC} alt="" aria-hidden="true" className={`${className} dark:hidden`} />
      <img src={DARK_SRC} alt="" aria-hidden="true" className={`hidden dark:block ${className}`} />
      <span className="sr-only">{alt}</span>
    </>
  );
}
