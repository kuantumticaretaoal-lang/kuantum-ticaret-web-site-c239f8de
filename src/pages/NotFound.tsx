import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { logger } from "@/lib/logger";
import SEO from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error("404: Geçersiz sayfa", { path: location.pathname });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SEO title="Sayfa Bulunamadı (404)" description="Aradığınız sayfa bulunamadı." path={location.pathname} noindex />
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Aradığınız sayfa bulunamadı.</p>
        <a href="/" className="text-primary underline hover:opacity-80">
          Ana Sayfaya Dön
        </a>
      </div>
    </div>
  );
};

export default NotFound;
