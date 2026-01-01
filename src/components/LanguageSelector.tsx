import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

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

  const handleSelect = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem("preferred_language", lang.code);
    // Sayfayı yenile veya context güncelle
    window.location.reload();
  };

  if (languages.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">
            {currentLanguage?.native_name} ({currentLanguage?.currency_symbol})
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
