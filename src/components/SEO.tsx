import { Helmet } from "react-helmet-async";

const SITE_URL = "https://kuantum-ticaret-web-site.lovable.app";
const DEFAULT_OG = `${SITE_URL}/og-image.jpg`;
const SITE_NAME = "Kuantum Ticaret";

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article" | "product";
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const SEO = ({ title, description, path, image, type = "website", noindex, jsonLd }: SEOProps) => {
  const url = `${SITE_URL}${path}`;
  const img = image || DEFAULT_OG;
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const truncTitle = fullTitle.length > 60 ? fullTitle.slice(0, 57) + "..." : fullTitle;
  const truncDesc = description.length > 160 ? description.slice(0, 157) + "..." : description;
  const schemas = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{truncTitle}</title>
      <meta name="description" content={truncDesc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={truncTitle} />
      <meta property="og:description" content={truncDesc} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={img} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="tr_TR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={truncTitle} />
      <meta name="twitter:description" content={truncDesc} />
      <meta name="twitter:image" content={img} />

      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify({ "@context": "https://schema.org", ...s })}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
