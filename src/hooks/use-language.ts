import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Language {
  code: string;
  name: string;
  native_name: string;
  currency_code: string;
  currency_symbol: string;
}

interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
}

interface LanguageContextType {
  currentLanguage: Language | null;
  languages: Language[];
  exchangeRates: ExchangeRate[];
  setLanguage: (code: string) => void;
  formatPrice: (price: number) => string;
  convertPrice: (price: number) => number;
}

const defaultLanguage: Language = {
  code: "tr",
  name: "Türkçe",
  native_name: "Türkçe",
  currency_code: "TRY",
  currency_symbol: "₺",
};

export const useLanguageData = (): LanguageContextType => {
  const [currentLanguage, setCurrentLanguage] = useState<Language | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);

  useEffect(() => {
    loadLanguages();
    loadExchangeRates();
  }, []);

  const loadLanguages = async () => {
    const { data } = await supabase
      .from("supported_languages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (data && data.length > 0) {
      setLanguages(data);

      // Kullanıcının kayıtlı tercihini veya varsayılanı yükle
      const savedCode = localStorage.getItem("preferred_language");
      const defaultLang = data.find((l) => l.is_default) || data[0];
      const selectedLang = savedCode ? data.find((l) => l.code === savedCode) : defaultLang;

      setCurrentLanguage(selectedLang || defaultLang);
    } else {
      setCurrentLanguage(defaultLanguage);
    }
  };

  const loadExchangeRates = async () => {
    const { data } = await supabase.from("exchange_rates").select("*");
    if (data) setExchangeRates(data);
  };

  const setLanguage = (code: string) => {
    const lang = languages.find((l) => l.code === code);
    if (lang) {
      setCurrentLanguage(lang);
      localStorage.setItem("preferred_language", code);
    }
  };

  const convertPrice = (priceInTRY: number): number => {
    if (!currentLanguage || currentLanguage.currency_code === "TRY") {
      return priceInTRY;
    }

    const rate = exchangeRates.find(
      (r) => r.from_currency === "TRY" && r.to_currency === currentLanguage.currency_code
    );

    if (rate) {
      return priceInTRY * rate.rate;
    }

    return priceInTRY;
  };

  const formatPrice = (priceInTRY: number): string => {
    const converted = convertPrice(priceInTRY);
    const symbol = currentLanguage?.currency_symbol || "₺";

    return `${symbol}${converted.toFixed(2)}`;
  };

  return {
    currentLanguage,
    languages,
    exchangeRates,
    setLanguage,
    formatPrice,
    convertPrice,
  };
};

// Simple export for direct use
export const useLanguage = useLanguageData;
