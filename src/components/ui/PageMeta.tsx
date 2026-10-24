import { Helmet } from 'react-helmet-async';
import { company, siteMeta } from '@/config/site';

type PageMetaProps = {
  title?: string;
  description?: string;
};

export function PageMeta({ title, description }: PageMetaProps) {
  const fullTitle = title ? `${title} — ${company.name}` : siteMeta.title;
  const desc = description || siteMeta.description;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
    </Helmet>
  );
}
