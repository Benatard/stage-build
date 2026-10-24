import { Reveal } from './Reveal';

type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  sub?: string;
  align?: 'center' | 'left';
};

export function SectionTitle({ eyebrow, title, sub, align = 'center' }: SectionTitleProps) {
  const centered = align === 'center';

  return (
    <Reveal
      className={
        centered ? 'max-w-[640px] mx-auto text-center mb-12 md:mb-16' : 'max-w-2xl mb-12 md:mb-16'
      }
    >
      {eyebrow && (
        <span className="eyebrow-root mb-4">
          <span className="h-1.5 w-1.5 bg-primary inline-block" />
          {eyebrow}
        </span>
      )}
      <h2 className="text-3xl sm:text-4xl md:text-[40px] font-bold tracking-tight leading-tight text-black dark:text-white">
        {title}
      </h2>
      {sub && (
        <p
          className={`mt-4 text-base md:text-lg text-body dark:text-body-dark max-w-[560px] ${
            centered ? 'mx-auto' : ''
          }`}
        >
          {sub}
        </p>
      )}
    </Reveal>
  );
}
