import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Language {
  code: string;
  name: string;
  native_name: string;
  currency_code: string;
  currency_symbol: string;
}

export const LanguageSelector = () => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLanguages();
  }, []);

  const loadLanguages = async () => {
    const { data } = await supabase
      .from("supported_languages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data && data.length > 0) {
      setLanguages(data);

      const savedCode = localStorage.getItem("preferred_language");
      const defaultLang = data.find((l) => l.is_default) || data[0];
      const selectedLang = savedCode ? data.find((l) => l.code === savedCode) : defaultLang;

      setCurrentLanguage(selectedLang || defaultLang);
    }
  };

  const refreshExchangeRates = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-exchange-rates");
      
      if (error) {
        console.error("Exchange rate fetch error:", error);
        toast({
          variant: "destructive",
          title: "Hata",
          description: "Döviz kurları güncellenemedi",
        });
      } else {
        toast({
          title: "Güncellendi",
          description: "Döviz kurları başarıyla güncellendi",
        });
      }
    } catch (err) {
      console.error("Error refreshing rates:", err);
    }
    setIsRefreshing(false);
  }, [toast]);

  const handleSelect = async (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem("preferred_language", lang.code);
    
    // Refresh exchange rates when language/currency changes
    if (lang.currency_code !== "TRY") {
      await refreshExchangeRates();
    }
    
    // Dispatch custom event to notify price components
    window.dispatchEvent(new CustomEvent("languageChange", { detail: lang }));
  };

  if (languages.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 text-white hover:text-white hover:bg-white/20">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage?.currency_symbol}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleSelect(lang)}
            className={currentLanguage?.code === lang.code ? "bg-muted" : ""}
          >
            <span className="flex-1">{lang.native_name}</span>
            <span className="text-muted-foreground ml-2">{lang.currency_symbol}</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={refreshExchangeRates} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Güncelleniyor..." : "Kurları Güncelle"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
