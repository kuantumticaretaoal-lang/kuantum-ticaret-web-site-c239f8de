import { useEffect } from "react";
import { useLocation } from "react-router-dom";

interface Props {
  type: "Organization" | "Product" | "BreadcrumbList" | "WebSite";
  data: Record<string, any>;
}

const SchemaOrg = ({ type, data }: Props) => {
  const location = useLocation();
  useEffect(() => {
    const id = `schema-${type}-${location.pathname}`;
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.id = id;
      document.head.appendChild(script);
    }
    script.text = JSON.stringify({ "@context": "https://schema.org", "@type": type, ...data });
    return () => { script?.remove(); };
  }, [type, JSON.stringify(data), location.pathname]);
  return null;
};

export default SchemaOrg;
