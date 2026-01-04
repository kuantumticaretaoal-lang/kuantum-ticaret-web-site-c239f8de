import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe, ChevronDown } from "lucide-react";

interface Language {
  code: string;
  name: string;
  native_name: string;
  currency_code: string;
  currency_symbol: string;
}

interface LanguageSelectorProps {
  variant?: "navbar" | "footer";
}

export const LanguageSelector = ({ variant = "navbar" }: LanguageSelectorProps) => {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);

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

  const handleSelect = async (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem("preferred_language", lang.code);
    
    // Döviz kurlarını arka planda güncelle (kullanıcı beklemeden)
    if (lang.currency_code !== "TRY") {
      supabase.functions.invoke("fetch-exchange-rates").catch(console.error);
    }
    
    // Dispatch custom event to notify components about language change
    window.dispatchEvent(new CustomEvent("languageChange", { detail: lang }));
  };

  if (languages.length <= 1) return null;

  if (variant === "footer") {
    return (
      <div className="space-y-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>{currentLanguage?.native_name}</span>
                <span className="text-white/70">({currentLanguage?.currency_symbol})</span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
